# Enhanced OAS Validation API Reference

Complete TypeScript API documentation for the enhanced OAS validation functionality in the `@kbn/validate-oas` package.

## API Overview

### Main Function

```typescript
import { runEnhancedValidation } from '@kbn/validate-oas';
```

## TypeScript Interfaces

### EnhancedValidationOptions

```typescript
interface EnhancedValidationOptions {
  /** File selection options */
  file?: FileSelectorOptions;
  /** Output formatting options */
  output?: OutputFormatterOptions;
  /** Git diff analysis options */
  git?: DiffAnalysisOptions;
  /** Enable incremental validation based on git changes */
  incremental?: boolean;
  /** Force validation even if no changes detected */
  force?: boolean;
  /** Base validation options (extends base validation functionality) */
  base?: Omit<BaseValidationOptions, 'customFiles' | 'useLogging'>;
}
```

### FileSelectorOptions

```typescript
interface FileSelectorOptions {
  only?: 'traditional' | 'serverless';
  includePaths?: string[];
  excludePaths?: string[];
}
```

### OutputFormatterOptions

```typescript
interface OutputFormatterOptions {
  format?: 'cli' | 'json' | 'github-comment';
  includeSuccessful?: boolean;
  groupByFile?: boolean;
}
```

### DiffAnalysisOptions

```typescript
interface DiffAnalysisOptions {
  baseBranch?: string;
  targetBranch?: string;
  staged?: boolean;
}
```

### EnhancedValidationResult

```typescript
interface EnhancedValidationResult {
  success: boolean;
  summary: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    totalErrors: number;
  };
  output: string;
  exitCode: number;
  gitAnalysis?: {
    hasOasChanges: boolean;
    affectedPaths: string[];
    shouldRunValidation: boolean;
  };
}
```

## Usage Examples

### Example 1: Basic Serverless Validation

```typescript
const result = await runEnhancedValidation({
  file: { only: 'serverless' },
  output: { format: 'cli' },
});

console.log(result.output);
// Output matches the original CLI format with enhanced features:
// About to validate spec at /path/to/kibana.serverless.yaml
//    │ warn /path/to/kibana.serverless.yaml is NOT valid
//    │ warn Found the following issues
//    │
//    │      /paths/~1api~1fleet~1agent_policies/get/responses/200
//    │      must have required property 'description'
//    │ ...
//    │ warn Found 25 errors in /path/to/kibana.serverless.yaml
// Done
```

### Example 2: Path Filtering for Focused Validation

```typescript
const result = await runEnhancedValidation({
  file: { 
    only: 'serverless',
    includePaths: ['/paths/~1api~1fleet~1agent_policies']
  },
  output: { format: 'cli' },
});

console.log(`Focused validation found ${result.summary.totalErrors} errors`);
// Only validates the specified API path for faster development cycles
```

### Example 3: JSON Output for CI/CD Integration

```typescript
const result = await runEnhancedValidation({
  file: { only: 'serverless' },
  output: { format: 'json' },
});

const jsonOutput = JSON.parse(result.output);
console.log(`Found ${jsonOutput.summary.totalErrors} errors in ${jsonOutput.summary.totalFiles} files`);

// Structured JSON output for CI/CD pipelines:
// {
//   "summary": {
//     "totalFiles": 1,
//     "validFiles": 0,
//     "invalidFiles": 1,
//     "totalErrors": 25
//   },
//   "results": [
//     {
//       "filePath": "/path/to/kibana.serverless.yaml",
//       "variant": "serverless",
//       "valid": false,
//       "errorCount": 25,
//       "errors": [
//         {
//           "instancePath": "/paths/~1api~1fleet~1agent_policies/get/responses/200",
//           "message": "must have required property 'description'",
//           "filePath": "/path/to/kibana.serverless.yaml",
//           "variant": "serverless"
//         }
//       ]
//     }
//   ]
// }
```

### Example 4: GitHub Comment Format for PR Automation

```typescript
const result = await runEnhancedValidation({
  file: { only: 'serverless' },
  output: { format: 'github-comment' },
});

console.log(result.output);
// Output formatted as GitHub markdown for PR comments:
// ## ❌ OpenAPI Specification Validation Issues Found
// 
// Found 25 validation error(s) across 1 file(s).
// 
// ### ☁️ serverless variant
// 
// **File:** `kibana.serverless.yaml`
// **Errors:** 25
// 
// #### `/paths/~1api~1fleet~1agent_policies`
// 
// - **GET /paths/~1api~1fleet~1agent_policies/get/responses/200**: must have required property 'description'
// - **POST /paths/~1api~1fleet~1agent_policies/post/responses/200**: must have required property 'description'
```

### Example 5: Incremental Validation with Git Integration

```typescript
const result = await runEnhancedValidation({
  incremental: true,
  git: { baseBranch: 'main' },
  output: { format: 'cli' },
});

if (result.gitAnalysis) {
  console.log('🔍 Git Analysis Results:');
  console.log(`- Has OAS-related changes: ${result.gitAnalysis.hasOasChanges}`);
  console.log(`- Affected API paths: ${result.gitAnalysis.affectedPaths.join(', ')}`);
  console.log(`- Validation needed: ${result.gitAnalysis.shouldRunValidation}`);
}

// Early exit optimization when no OAS changes detected:
// "No OAS-related changes detected. Skipping validation."
```

### Example 6: Force Validation Override

```typescript
const result = await runEnhancedValidation({
  incremental: true,
  force: true,  // Override incremental detection
  git: { baseBranch: 'main' },
  output: { format: 'json' },
});

// Forces validation even when incremental mode detects no changes
```

### Example 7: Multiple Path Filtering

```typescript
const result = await runEnhancedValidation({
  file: {
    only: 'traditional',
    includePaths: [
      '/paths/~1api~1fleet',
      '/paths/~1api~1saved_objects',
      '/paths/~1api~1security'
    ],
    excludePaths: [
      '/paths/~1api~1fleet~1internal'  // Exclude internal APIs
    ]
  },
  output: { format: 'cli', groupByFile: true },
});
```

## Advanced Configuration

### Complete Options Interface

```typescript
interface EnhancedValidationOptions {
  /** File selection and filtering options */
  file?: {
    only?: 'traditional' | 'serverless';        // Validate specific variant
    includePaths?: string[];                     // Focus on specific API paths
    excludePaths?: string[];                     // Exclude specific API paths
  };
  
  /** Output formatting and display options */
  output?: {
    format?: 'cli' | 'json' | 'github-comment'; // Output format
    includeSuccessful?: boolean;                 // Show successful validations
    groupByFile?: boolean;                       // Group errors by file
  };
  
  /** Git integration options for incremental validation */
  git?: {
    baseBranch?: string;                         // Base branch (default: 'main')
    targetBranch?: string;                       // Target branch for comparison
    staged?: boolean;                            // Analyze only staged changes
  };
  
  /** Incremental validation control */
  incremental?: boolean;                         // Enable git-based incremental validation
  force?: boolean;                              // Force validation regardless of changes
  
  /** Base validation options passthrough */
  base?: Omit<BaseValidationOptions, 'customFiles' | 'useLogging'>;
}
```

## Error Handling and Result Analysis

### Handling Validation Results

```typescript
async function handleValidationResults() {
  try {
    const result = await runEnhancedValidation({
      file: { only: 'serverless' },
      output: { format: 'json' },
      incremental: true,
    });

    if (result.success) {
      console.log('✅ All validations passed');
      console.log(`Validated ${result.summary.totalFiles} files successfully`);
    } else {
      console.error('❌ Validation failed');
      console.error(`Found ${result.summary.totalErrors} errors in ${result.summary.invalidFiles} files`);
      
      // Parse JSON output for detailed error analysis
      if (result.output.startsWith('{')) {
        const jsonResult = JSON.parse(result.output);
        jsonResult.results.forEach(fileResult => {
          console.log(`\n📄 ${fileResult.filePath} (${fileResult.variant}):`);
          fileResult.errors.forEach(error => {
            console.log(`  - ${error.instancePath}: ${error.message}`);
          });
        });
      }
    }

    // Use exit code for CI/CD integration
    process.exit(result.exitCode);
  } catch (error) {
    console.error('💥 Validation execution failed:', error.message);
    process.exit(1);
  }
}
```

### Performance Analysis

```typescript
async function performanceOptimizedValidation() {
  const startTime = Date.now();
  
  const result = await runEnhancedValidation({
    incremental: true,  // Skip unchanged files
    file: {
      includePaths: ['/paths/~1api~1fleet']  // Focus on specific areas
    },
    output: { format: 'json' }
  });
  
  const duration = Date.now() - startTime;
  console.log(`⚡ Validation completed in ${duration}ms`);
  
  if (result.gitAnalysis) {
    console.log(`🎯 Incremental optimization: ${result.gitAnalysis.shouldRunValidation ? 'validation needed' : 'skipped'}`);
  }
  
  return result;
}
```

## Integration Patterns

### CI/CD Pipeline Integration

```typescript
// buildkite-pipeline.ts
export async function runOASValidationStep() {
  const result = await runEnhancedValidation({
    incremental: true,
    git: { baseBranch: process.env.BUILDKITE_PULL_REQUEST_BASE_BRANCH || 'main' },
    output: { format: 'json' },
    force: process.env.FORCE_VALIDATION === 'true'
  });
  
  // Save results for artifact collection
  await writeFile('oas-validation-results.json', result.output);
  
  return result.exitCode;
}
```

### GitHub Actions Integration

```typescript
// github-pr-comment.ts
export async function generatePRComment() {
  const result = await runEnhancedValidation({
    incremental: true,
    git: { 
      baseBranch: process.env.GITHUB_BASE_REF,
      staged: false 
    },
    output: { format: 'github-comment' }
  });
  
  if (!result.success) {
    // Post comment to PR using GitHub API
    await postGitHubComment(result.output);
  }
  
  return result;
}
```

## Migration from Legacy CLI

### Equivalent Commands

| Legacy CLI | Enhanced API |
|------------|--------------|
| `node scripts/validate_oas_docs.js` | `runEnhancedValidation({ output: { format: 'cli' } })` |
| `node scripts/validate_oas_docs.js --only serverless` | `runEnhancedValidation({ file: { only: 'serverless' } })` |
| `node scripts/validate_oas_docs.js --path /api/fleet` | `runEnhancedValidation({ file: { includePaths: ['/paths/~1api~1fleet'] } })` |

### Performance Improvements

- **Incremental Validation**: Only validate changed files/paths
- **Smart Path Detection**: Git analysis maps source changes to API paths
- **Flexible Output**: Choose optimal format for your use case
- **Caching**: Built-in result caching for repeated validations
```

### Return Value Structure

```typescript
interface EnhancedValidationResult {
  success: boolean;        // Overall validation success
  summary: {
    totalFiles: number;
    validFiles: number;
    invalidFiles: number;
    totalErrors: number;
  };
  output: string;         // Formatted output based on format option
  exitCode: number;       // 0 for success, 1 for validation errors
  gitAnalysis?: {         // Only present when incremental: true
    hasOasChanges: boolean;
    affectedPaths: string[];
    shouldRunValidation: boolean;
  };
}
```

## Integration Examples

### CI/CD Pipeline Integration

```typescript
// In a CI/CD script
const result = await runEnhancedValidation({
  incremental: true,
  output: { format: 'github-comment' },
  force: process.env.CI === 'true', // Always validate in CI
});

// Post GitHub comment with results
if (!result.success) {
  await postGitHubComment(result.output);
  process.exit(result.exitCode);
}
```

### Pre-commit Hook Integration

```typescript
// In a pre-commit hook
const result = await runEnhancedValidation({
  incremental: true,
  git: { staged: true }, // Only check staged changes
  output: { format: 'cli' },
});

if (!result.success) {
  console.error(result.output);
  process.exit(1);
}
```

### Development Workflow Integration

```typescript
// During development
const result = await runEnhancedValidation({
  file: { 
    only: 'serverless',
    includePaths: ['/paths/~1api~1my_new_feature']
  },
  output: { 
    format: 'cli',
    includeSuccessful: true 
  },
});

console.log(result.output);
```
