# Priority 1: Buildkite CI/CD Integration - Detailed Implementation Plan

**Objective:** Create Buildkite pipeline integration for enhanced OAS validation  
**Timeline:** 3-4 days  
**Dependencies:** None (foundation complete)  
**Success Criteria:** Automated OAS validation in CI/CD with performance targets met  

---

## 📋 STEP-BY-STEP IMPLEMENTATION PLAN

### **Day 1: Create Buildkite Validation Script**

#### **Step 1.1: Create the validation script file**

**File Location:** `.buildkite/scripts/steps/checks/validate_oas_enhanced.sh`

```bash
#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# Follow established pattern: bootstrap first
.buildkite/scripts/bootstrap.sh

echo --- Enhanced OAS Validation

# Build the validation command with intelligent defaults
cmd="node scripts/validate_oas_docs.js enhanced"

# Configure output format for CI/CD integration
cmd="$cmd --format json"

# Enable incremental validation for performance
cmd="$cmd --incremental"

# Configure variant handling based on branch
if [[ $BUILDKITE_PULL_REQUEST != "false" && "$BUILDKITE_PULL_REQUEST_BASE_BRANCH" != "main" ]] || [[ $BUILDKITE_PULL_REQUEST == "false" && "$BUILDKITE_BRANCH" != "main" ]]; then
  # For non-main branches, skip serverless to reduce processing time
  cmd="$cmd --only traditional"
else
  # For main branch, validate all variants
  echo "Validating all OAS variants (traditional + serverless)"
fi

# Add force flag for non-PR builds to ensure validation runs
if [[ $BUILDKITE_PULL_REQUEST == "false" ]]; then
  cmd="$cmd --force"
fi

# Execution function with proper error handling
run_oas_validation() {
  echo "Executing: $cmd"
  
  # Capture output to both file and stdout
  if eval "$cmd" | tee oas-validation-results.json; then
    echo "✅ OAS validation completed successfully"
    
    # Check if there were any validation errors in the JSON output
    if command -v jq >/dev/null 2>&1; then
      error_count=$(jq -r '.summary.totalErrors // 0' oas-validation-results.json 2>/dev/null || echo "0")
      if [[ "$error_count" -gt 0 ]]; then
        echo "❌ Found $error_count validation errors"
        echo "::group::Validation Results"
        cat oas-validation-results.json
        echo "::endgroup::"
        return 1
      else
        echo "✅ No validation errors found"
      fi
    fi
    
    return 0
  else
    echo "❌ OAS validation failed"
    return 1
  fi
}

# Execute with retry logic (following capture_oas_snapshot pattern)
retry 3 10 run_oas_validation

# Upload results as artifact for downstream processing
if [[ -f oas-validation-results.json ]]; then
  buildkite-agent artifact upload oas-validation-results.json
  echo "📁 Validation results uploaded as artifact"
fi

echo "✅ Enhanced OAS validation completed"
```

#### **Step 1.2: Make the script executable**

```bash
chmod +x .buildkite/scripts/steps/checks/validate_oas_enhanced.sh
```

#### **Step 1.3: Test the script locally**

```bash
# Test the validation command directly
cd /Users/christianeheiligers/Projects/kibana
node scripts/validate_oas_docs.js enhanced --format json --incremental

# Test the script execution
./.buildkite/scripts/steps/checks/validate_oas_enhanced.sh
```

**Expected Results:**
- ✅ Script executes without errors
- ✅ JSON output is generated
- ✅ Performance is under 5 minutes
- ✅ Incremental validation works correctly

---

### **Day 2: Configure Conditional Execution**

#### **Step 2.1: Add OAS change detection**

**Update the validation script to include conditional execution:**

```bash
# Add this section after the bootstrap step in validate_oas_enhanced.sh

# Check if OAS-related files have changed
has_oas_changes() {
  # Use the enhanced validation's built-in git analysis
  local git_analysis
  git_analysis=$(node scripts/validate_oas_docs.js enhanced --incremental --format json 2>/dev/null | jq -r '.gitAnalysis.hasOasChanges // false' 2>/dev/null || echo "false")
  
  if [[ "$git_analysis" == "true" ]]; then
    return 0
  fi
  
  # Fallback: check for direct OAS file changes
  if git diff --name-only "${BUILDKITE_PULL_REQUEST_BASE_BRANCH:-main}...HEAD" | grep -E "(oas_docs/|\.ya?ml$|routes.*\.ts$)" >/dev/null 2>&1; then
    return 0
  fi
  
  return 1
}

# Early exit if no OAS changes (unless forced)
if [[ $BUILDKITE_PULL_REQUEST != "false" ]] && ! has_oas_changes && [[ "${FORCE_OAS_VALIDATION:-}" != "true" ]]; then
  echo "ℹ️  No OAS-related changes detected, skipping validation"
  echo "To force validation, set FORCE_OAS_VALIDATION=true"
  exit 0
fi

echo "🔍 OAS-related changes detected, proceeding with validation"
```

#### **Step 2.2: Test conditional execution**

```bash
# Test with changes
git diff --name-only main...HEAD

# Test the conditional logic
BUILDKITE_PULL_REQUEST="123" \
BUILDKITE_PULL_REQUEST_BASE_BRANCH="main" \
./.buildkite/scripts/steps/checks/validate_oas_enhanced.sh

# Test forced execution
FORCE_OAS_VALIDATION=true \
./.buildkite/scripts/steps/checks/validate_oas_enhanced.sh
```

**Expected Results:**
- ✅ Skips validation when no OAS changes
- ✅ Runs validation when OAS changes detected
- ✅ Force flag works correctly
- ✅ Git analysis integration works

---

### **Day 3: Integrate with Buildkite Pipeline**

#### **Step 3.1: Identify the integration point**

**Research existing pipeline configuration:**

```bash
# Find where checks are defined
find .buildkite -name "*.yml" -o -name "*.yaml" | head -10
find .buildkite -name "*pipeline*" | head -10
```

#### **Step 3.2: Add to checks pipeline**

**Location:** Look for pipeline configuration files (typically in `.buildkite/` root)

**Add the new check to the appropriate pipeline configuration:**

```yaml
# Example integration (exact location depends on existing structure)
- label: ":scroll: Enhanced OAS Validation"
  command: .buildkite/scripts/steps/checks/validate_oas_enhanced.sh
  key: "validate-oas-enhanced"
  agents:
    queue: "kibana-default"
  timeout_in_minutes: 10
  retry:
    automatic:
      - exit_status: "*"
        limit: 1
  artifact_paths:
    - "oas-validation-results.json"
```

#### **Step 3.3: Configure pipeline ordering**

**Ensure the validation runs at the appropriate time:**
- After bootstrap and basic checks
- Before final merge/deploy steps
- In parallel with other validation checks

---

### **Day 4: Testing and Validation**

#### **Step 4.1: End-to-end testing**

**Test Scenarios:**

1. **PR with OAS changes:**
   ```bash
   # Create test PR with OAS file changes
   # Verify validation runs and reports results
   ```

2. **PR without OAS changes:**
   ```bash
   # Create test PR with non-OAS changes
   # Verify validation is skipped
   ```

3. **Main branch build:**
   ```bash
   # Test main branch execution
   # Verify forced validation works
   ```

4. **Error scenarios:**
   ```bash
   # Test with validation errors
   # Verify proper error reporting and exit codes
   ```

#### **Step 4.2: Performance validation**

**Measure and optimize:**

```bash
# Time the validation execution
time ./.buildkite/scripts/steps/checks/validate_oas_enhanced.sh

# Check resource usage
# Verify < 5 minute execution time
# Ensure proper cleanup
```

#### **Step 4.3: Integration testing**

**Validate pipeline integration:**
- Check Buildkite UI shows the new step
- Verify artifacts are uploaded correctly
- Test retry logic and error handling
- Validate conditional execution in real environment

**Expected Results:**
- ✅ End-to-end pipeline works
- ✅ Performance meets targets (< 5 minutes)
- ✅ Error handling is robust
- ✅ Conditional execution works in CI environment

---

## 🔧 TECHNICAL IMPLEMENTATION DETAILS

### **Integration Points:**

1. **Bootstrap Integration:**
   - Uses existing `.buildkite/scripts/bootstrap.sh`
   - Follows established pattern from other checks

2. **Utility Functions:**
   - Leverages `.buildkite/scripts/common/util.sh`
   - Uses `retry` function for reliability
   - Uses conditional logic patterns

3. **Artifact Management:**
   - Uploads JSON results as Buildkite artifacts
   - Enables downstream processing for Priority 2

### **Configuration Options:**

**Environment Variables:**
- `FORCE_OAS_VALIDATION`: Force validation even without changes
- `OAS_VALIDATION_TIMEOUT`: Override default timeout
- `OAS_VALIDATION_VARIANTS`: Override variant selection

**Command-line Flexibility:**
```bash
# Different execution modes
node scripts/validate_oas_docs.js enhanced --format json --incremental
node scripts/validate_oas_docs.js enhanced --format json --force --only serverless
node scripts/validate_oas_docs.js enhanced --format json --path /api/fleet
```

### **Error Handling Strategy:**

1. **Graceful Degradation:**
   - Falls back to full validation if incremental fails
   - Continues execution with warnings for non-critical errors

2. **Clear Error Messages:**
   - Structured error output in JSON format
   - Human-readable error summaries in logs

3. **Retry Logic:**
   - 3 retries with 10-second delays
   - Follows existing Buildkite patterns

---

## ✅ SUCCESS CRITERIA & VALIDATION

### **Functional Requirements:**

- ✅ **Conditional Execution:** Only runs when OAS files change
- ✅ **Performance:** Completes within 5-minute target
- ✅ **JSON Output:** Structured results for downstream processing
- ✅ **Error Handling:** Proper exit codes and error reporting
- ✅ **Artifact Upload:** Results available for Priority 2 (PR comments)

### **Integration Requirements:**

- ✅ **Pipeline Integration:** Shows up in Buildkite UI
- ✅ **Branch Handling:** Different behavior for main vs PR branches
- ✅ **Resource Management:** Proper cleanup and resource usage
- ✅ **Backward Compatibility:** Doesn't break existing workflows

### **Quality Requirements:**

- ✅ **Reliability:** Handles edge cases and failures gracefully
- ✅ **Maintainability:** Follows existing code patterns
- ✅ **Documentation:** Clear implementation and usage docs
- ✅ **Testing:** Comprehensive testing across scenarios

---

## 🚨 POTENTIAL ISSUES & SOLUTIONS

### **Common Issues:**

1. **Permission Problems:**
   ```bash
   # Solution: Ensure script is executable
   chmod +x .buildkite/scripts/steps/checks/validate_oas_enhanced.sh
   ```

2. **Bootstrap Dependencies:**
   ```bash
   # Solution: Ensure bootstrap completes successfully
   .buildkite/scripts/bootstrap.sh
   ```

3. **Git Analysis Failures:**
   ```bash
   # Solution: Add fallback to direct file diff
   git diff --name-only main...HEAD | grep -E "oas_docs/"
   ```

4. **JSON Parsing Issues:**
   ```bash
   # Solution: Add jq availability check
   if command -v jq >/dev/null 2>&1; then
     # Use jq
   else
     # Use basic grep/sed fallback
   fi
   ```

### **Testing Commands:**

```bash
# Local testing
./.buildkite/scripts/steps/checks/validate_oas_enhanced.sh

# Debug mode
set -x
./.buildkite/scripts/steps/checks/validate_oas_enhanced.sh

# Performance testing
time ./.buildkite/scripts/steps/checks/validate_oas_enhanced.sh
```

---

## 🎯 NEXT STEPS AFTER COMPLETION

Once Priority 1 is complete:

1. **Validate JSON Output:** Ensure results are properly structured for Priority 2
2. **Document Usage:** Update team documentation with new validation step
3. **Monitor Performance:** Track execution times and optimize if needed
4. **Prepare for Priority 2:** Confirm artifact upload works for PR comment automation

**Key Deliverable:** Working Buildkite integration that automatically validates OAS changes and provides structured output for downstream processing.

This detailed implementation plan provides everything needed to complete Priority 1 successfully! 🚀
