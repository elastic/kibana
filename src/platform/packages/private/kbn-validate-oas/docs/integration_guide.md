# Enhanced OAS Validation Integration Guide

## 📋 Overview

This guide provides practical integration patterns for the enhanced OAS validation system, covering CI/CD automation, developer workflow optimization, and performance best practices for teams adopting the enhanced validation capabilities.

## 🚀 **CI/CD Integration Patterns**

### **GitHub Actions Integration**

#### Basic PR Validation

```yaml
name: OAS Validation

on:
  pull_request:
    paths:
      - 'oas_docs/**'
      - 'x-pack/solutions/*/plugins/*/server/routes/**'
      - 'packages/core/http/**'

jobs:
  validate-oas:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Required for git analysis
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version-file: '.nvmrc'
          cache: 'yarn'
          
      - name: Bootstrap Kibana
        run: yarn kbn bootstrap
        
      - name: Run Enhanced OAS Validation
        run: |
          node scripts/validate_oas_docs.js enhanced \\
            --incremental \\
            --format json > oas-validation-results.json
            
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: oas-validation-results
          path: oas-validation-results.json
```

#### Advanced PR Automation with Comments

```yaml
name: OAS Validation with PR Comments

on:
  pull_request:
    paths:
      - 'oas_docs/**'
      - '**/*routes*/**'

jobs:
  validate-oas:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout with Full History
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Setup Environment
        uses: actions/setup-node@v3
        with:
          node-version-file: '.nvmrc'
          cache: 'yarn'
          
      - name: Bootstrap Dependencies
        run: yarn kbn bootstrap
        
      - name: Validate OAS with GitHub Comment Format
        id: validate
        run: |
          set +e  # Don't fail on validation errors
          node scripts/validate_oas_docs.js enhanced \\
            --incremental \\
            --format github-comment > pr-comment.md
          echo "validation_exit_code=$?" >> $GITHUB_OUTPUT
          
      - name: Post PR Comment on Failure
        if: steps.validate.outputs.validation_exit_code != '0'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const comment = fs.readFileSync('pr-comment.md', 'utf8');
            
            // Find existing OAS validation comment
            const { data: comments } = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });
            
            const existingComment = comments.find(comment => 
              comment.body.includes('OpenAPI Specification Validation')
            );
            
            if (existingComment) {
              // Update existing comment
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existingComment.id,
                body: comment
              });
            } else {
              // Create new comment
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: comment
              });
            }
            
      - name: Fail Job on Validation Errors
        if: steps.validate.outputs.validation_exit_code != '0'
        run: exit 1
```

### **Buildkite Pipeline Integration**

#### Standard Pipeline Step

```yaml
steps:
  - label: "🔍 OAS Validation Enhanced"
    command: |
      yarn kbn bootstrap
      node scripts/validate_oas_docs.js enhanced \\
        --incremental \\
        --format json \\
        --only serverless > oas-validation-results.json
    artifact_paths:
      - "oas-validation-results.json"
    retry:
      automatic:
        - exit_status: "*"
          limit: 2
```

#### Advanced Pipeline with Conditional Execution

```yaml
steps:
  - label: "🔍 OAS Validation - Smart Execution"
    command: |
      yarn kbn bootstrap
      
      # Check if OAS validation is needed
      if node scripts/validate_oas_docs.js enhanced --incremental --format json; then
        echo "✅ OAS validation passed or no validation needed"
        echo "validation_status=success" | buildkite-agent meta-data set
      else
        echo "❌ OAS validation failed"
        echo "validation_status=failed" | buildkite-agent meta-data set
        
        # Generate detailed report for artifact
        node scripts/validate_oas_docs.js enhanced \\
          --force \\
          --format json > oas-validation-detailed.json
        exit 1
      fi
    artifact_paths:
      - "oas-validation-*.json"
    env:
      FORCE_VALIDATION: ${FORCE_OAS_VALIDATION:-false}
```

### **Jenkins Pipeline Integration**

```groovy
pipeline {
    agent any
    
    environment {
        NODE_VERSION = readFile('.nvmrc').trim()
    }
    
    stages {
        stage('Setup') {
            steps {
                nvm(version: env.NODE_VERSION) {
                    sh 'yarn kbn bootstrap'
                }
            }
        }
        
        stage('OAS Validation') {
            steps {
                nvm(version: env.NODE_VERSION) {
                    script {
                        def validationResult = sh(
                            script: '''
                                node scripts/validate_oas_docs.js enhanced \\
                                    --incremental \\
                                    --format json > oas-results.json
                            ''',
                            returnStatus: true
                        )
                        
                        if (validationResult != 0) {
                            archiveArtifacts artifacts: 'oas-results.json'
                            error("OAS validation failed")
                        }
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'oas-results.json', allowEmptyArchive: true
                }
            }
        }
    }
}
```

## 👨‍💻 **Developer Workflow Integration**

### **VS Code Tasks Integration**

Create `.vscode/tasks.json`:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "OAS Validation - Quick Check",
            "type": "shell",
            "command": "node scripts/validate_oas_docs.js enhanced --incremental",
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared",
                "showReuseMessage": true,
                "clear": false
            },
            "problemMatcher": [],
            "detail": "Quick incremental OAS validation for current changes"
        },
        {
            "label": "OAS Validation - Full Serverless",
            "type": "shell", 
            "command": "node scripts/validate_oas_docs.js enhanced --only serverless --format json",
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "shared"
            },
            "problemMatcher": [],
            "detail": "Complete validation of serverless OAS specification"
        },
        {
            "label": "OAS Validation - Focus on Fleet APIs",
            "type": "shell",
            "command": "node scripts/validate_oas_docs.js enhanced --path /paths/~1api~1fleet --format cli",
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always", 
                "focus": false,
                "panel": "shared"
            },
            "problemMatcher": [],
            "detail": "Focused validation on Fleet API endpoints"
        }
    ]
}
```

### **Git Hooks Integration**

#### Pre-commit Hook (`.git/hooks/pre-commit`)

```bash
#!/bin/sh
# Pre-commit hook for OAS validation

echo "🔍 Running OAS validation on staged changes..."

# Check if we're in a Kibana repository
if [ ! -f "scripts/validate_oas_docs.js" ]; then
    echo "⚠️  Not in Kibana repository, skipping OAS validation"
    exit 0
fi

# Run enhanced validation with staged changes
if node scripts/validate_oas_docs.js enhanced --incremental --format cli; then
    echo "✅ OAS validation passed"
    exit 0
else
    echo "❌ OAS validation failed"
    echo "💡 Fix the issues above or use 'git commit --no-verify' to skip validation"
    exit 1
fi
```

#### Pre-push Hook (`.git/hooks/pre-push`)

```bash
#!/bin/sh
# Pre-push hook for comprehensive OAS validation

echo "🚀 Running comprehensive OAS validation before push..."

# Run full validation to ensure push quality
if node scripts/validate_oas_docs.js enhanced --force --format cli; then
    echo "✅ Comprehensive OAS validation passed"
    exit 0
else
    echo "❌ Comprehensive OAS validation failed"
    echo "💡 Fix all issues before pushing or use 'git push --no-verify'"
    exit 1
fi
```

### **IDE Integration Scripts**

#### WebStorm Run Configuration

Create `.idea/runConfigurations/OAS_Validation_Enhanced.xml`:

```xml
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="OAS Validation Enhanced" type="NodeJSConfigurationType" working-dir="$PROJECT_DIR$">
    <node-interpreter value="project" />
    <node-options value="" />
    <script-name value="scripts/validate_oas_docs.js" />
    <parameters value="enhanced --incremental --format cli" />
    <envs />
    <method v="2" />
  </configuration>
</component>
```

### **Make/NPM Script Integration**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "oas:validate": "node scripts/validate_oas_docs.js enhanced --incremental",
    "oas:validate:full": "node scripts/validate_oas_docs.js enhanced --force",
    "oas:validate:serverless": "node scripts/validate_oas_docs.js enhanced --only serverless",
    "oas:validate:json": "node scripts/validate_oas_docs.js enhanced --format json",
    "oas:validate:ci": "node scripts/validate_oas_docs.js enhanced --incremental --format json"
  }
}
```

## ⚡ **Performance Optimization Guide**

### **Development Workflow Optimization**

#### Fast Development Iteration

```bash
# Quick validation for active development
npm run oas:validate

# Focus on specific API area during feature development
node scripts/validate_oas_docs.js enhanced \\
  --path /paths/~1api~1my_feature \\
  --incremental

# Serverless-only validation for faster feedback
node scripts/validate_oas_docs.js enhanced \\
  --only serverless \\
  --incremental
```

#### Efficient Error Debugging

```bash
# JSON output for programmatic analysis
node scripts/validate_oas_docs.js enhanced \\
  --format json \\
  --path /paths/~1api~1problematic_endpoint > errors.json

# GitHub comment format for team sharing
node scripts/validate_oas_docs.js enhanced \\
  --format github-comment \\
  --only serverless > team_review.md
```

### **CI/CD Performance Optimization**

#### Intelligent Pipeline Execution

```yaml
# Only run validation when OAS-related files change
on:
  pull_request:
    paths:
      - 'oas_docs/**'
      - 'x-pack/solutions/*/plugins/*/server/routes/**'
      - 'packages/core/http/**'

# Use incremental validation to skip unchanged files
- name: Smart OAS Validation
  run: |
    if node scripts/validate_oas_docs.js enhanced --incremental --format json; then
      echo "No OAS validation needed or validation passed"
    else
      echo "OAS validation failed - see details above"
      exit 1
    fi
```

#### Parallel Validation Strategy

```yaml
jobs:
  validate-traditional:
    runs-on: ubuntu-latest
    steps:
      - # ... setup steps
      - name: Validate Traditional OAS
        run: node scripts/validate_oas_docs.js enhanced --only traditional --format json
        
  validate-serverless:
    runs-on: ubuntu-latest  
    steps:
      - # ... setup steps
      - name: Validate Serverless OAS
        run: node scripts/validate_oas_docs.js enhanced --only serverless --format json
```

### **Resource Optimization**

#### Memory Usage Optimization

```bash
# For large repositories, use incremental mode
NODE_OPTIONS="--max-old-space-size=2048" \\
  node scripts/validate_oas_docs.js enhanced --incremental

# Focus validation to reduce memory footprint
node scripts/validate_oas_docs.js enhanced \\
  --only serverless \\
  --path /paths/~1api~1specific_area
```

#### Cache Optimization

```bash
# Ensure git repository is available for optimal caching
git fetch origin main

# Use force flag judiciously to balance cache efficiency
node scripts/validate_oas_docs.js enhanced \\
  --incremental \\
  --force=false  # Only when really needed
```

## 🔧 **Advanced Configuration Patterns**

### **Environment-Specific Configurations**

#### Development Environment

```bash
# .env.development
OAS_VALIDATION_MODE=enhanced
OAS_VALIDATION_FORMAT=cli
OAS_VALIDATION_INCREMENTAL=true
OAS_VALIDATION_CACHE_ENABLED=true
```

```bash
# Development script
#!/bin/bash
source .env.development

node scripts/validate_oas_docs.js $OAS_VALIDATION_MODE \\
  --format $OAS_VALIDATION_FORMAT \\
  $([ "$OAS_VALIDATION_INCREMENTAL" = "true" ] && echo "--incremental")
```

#### CI/CD Environment

```bash
# .env.ci
OAS_VALIDATION_MODE=enhanced
OAS_VALIDATION_FORMAT=json
OAS_VALIDATION_INCREMENTAL=true
OAS_VALIDATION_FORCE=${FORCE_VALIDATION:-false}
```

### **Team Workflow Configurations**

#### Code Review Workflow

```bash
# Reviewer validation script
#!/bin/bash
echo "🔍 Running OAS validation for code review..."

# Check what's changed in this PR
node scripts/validate_oas_docs.js enhanced \\
  --incremental \\
  --format github-comment > review-oas-check.md

if [ $? -eq 0 ]; then
    echo "✅ OAS validation passed for PR changes"
else
    echo "❌ OAS issues found - see review-oas-check.md"
    cat review-oas-check.md
fi
```

#### Release Validation Workflow

```bash
# Release preparation script
#!/bin/bash
echo "🚀 Running comprehensive OAS validation for release..."

# Full validation without incremental optimization
node scripts/validate_oas_docs.js enhanced \\
  --force \\
  --format json > release-oas-validation.json

# Generate human-readable report
node scripts/validate_oas_docs.js enhanced \\
  --force \\
  --format cli > release-oas-report.txt

echo "📊 Release validation complete - check reports for details"
```

## 🐛 **Troubleshooting & Common Issues**

### **Performance Issues**

#### Slow Validation Performance

```bash
# Problem: Validation takes too long
# Solution 1: Use incremental mode
node scripts/validate_oas_docs.js enhanced --incremental

# Solution 2: Focus on specific areas
node scripts/validate_oas_docs.js enhanced --only serverless

# Solution 3: Check git repository status
git status  # Ensure clean repository state
git fetch origin main  # Update git references
```

#### Memory Usage Issues

```bash
# Problem: Out of memory errors
# Solution 1: Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" \\
  node scripts/validate_oas_docs.js enhanced

# Solution 2: Use incremental validation
node scripts/validate_oas_docs.js enhanced --incremental --only serverless

# Solution 3: Clear Node.js cache
rm -rf node_modules/.cache
yarn kbn bootstrap
```

### **Integration Issues**

#### Git Repository Detection Problems

```bash
# Problem: "Not in git repository" error
# Solution 1: Ensure you're in the repository root
cd /path/to/kibana
git status

# Solution 2: Initialize git if needed
git init
git remote add origin <kibana-repo-url>

# Solution 3: Use non-incremental mode
node scripts/validate_oas_docs.js enhanced --format json
```

#### CI/CD Integration Issues

```bash
# Problem: Validation fails in CI but works locally
# Solution 1: Check git fetch depth in CI
# Ensure fetch-depth: 0 in checkout action

# Solution 2: Verify bootstrap completion
yarn kbn bootstrap --force-install

# Solution 3: Check environment differences
node --version  # Verify Node.js version matches .nvmrc
yarn --version  # Verify Yarn version compatibility
```

### **Output Format Issues**

#### JSON Parsing Problems

```bash
# Problem: Invalid JSON output
# Solution 1: Check for stdout pollution
node scripts/validate_oas_docs.js enhanced \\
  --format json 2>/dev/null > clean-output.json

# Solution 2: Validate JSON structure
node -e "JSON.parse(require('fs').readFileSync('output.json', 'utf8'))"

# Solution 3: Use CLI format for debugging
node scripts/validate_oas_docs.js enhanced --format cli
```

## 📈 **Monitoring & Metrics**

### **Performance Monitoring**

#### Validation Performance Tracking

```bash
# Track validation performance over time
#!/bin/bash
echo "📊 OAS Validation Performance Tracking"

start_time=$(date +%s)
node scripts/validate_oas_docs.js enhanced --incremental --format json > results.json
end_time=$(date +%s)

duration=$((end_time - start_time))
echo "Validation completed in ${duration} seconds"

# Log performance metrics
echo "$(date),${duration},$(cat results.json | jq '.summary.totalErrors')" >> oas-performance.csv
```

#### Cache Efficiency Monitoring

```bash
# Monitor cache hit rates and effectiveness
#!/bin/bash
echo "🎯 Cache Performance Analysis"

# Run with cache enabled
node scripts/validate_oas_docs.js enhanced --incremental > cache-enabled.log 2>&1

# Extract cache statistics (implementation-dependent)
grep -E "cache|Cache" cache-enabled.log || echo "Cache statistics not available in output"
```

### **Quality Metrics Tracking**

#### Error Trend Analysis

```bash
# Track error trends over time
#!/bin/bash
date=$(date +%Y-%m-%d)
node scripts/validate_oas_docs.js enhanced --format json > "oas-results-${date}.json"

# Extract summary metrics
total_errors=$(cat "oas-results-${date}.json" | jq '.summary.totalErrors')
total_files=$(cat "oas-results-${date}.json" | jq '.summary.totalFiles')

echo "${date},${total_errors},${total_files}" >> oas-quality-metrics.csv
```

## 🎯 **Best Practices Summary**

### **Development Workflow**
- **Use incremental validation** for fast development iteration
- **Focus validation** on specific API areas during feature development
- **Integrate with IDE** using tasks and run configurations
- **Set up git hooks** for automatic validation on commit/push

### **CI/CD Integration**
- **Use conditional execution** to skip validation when not needed
- **Implement smart caching** to improve pipeline performance
- **Generate structured output** (JSON) for automated processing
- **Provide user-friendly feedback** with GitHub comment format

### **Team Adoption**
- **Start with legacy compatibility** to ensure smooth transition
- **Gradually adopt enhanced features** as team becomes comfortable
- **Document team-specific workflows** for consistent adoption
- **Share performance optimizations** to benefit entire team

### **Performance Optimization**
- **Monitor validation performance** and optimize as needed
- **Use appropriate validation scope** (incremental, specific variants, focused paths)
- **Optimize CI/CD pipelines** with intelligent execution strategies
- **Track metrics over time** to identify performance trends

This integration guide provides comprehensive patterns for adopting the enhanced OAS validation system across different environments and workflows, ensuring teams can maximize the benefits while maintaining high performance and developer productivity.
