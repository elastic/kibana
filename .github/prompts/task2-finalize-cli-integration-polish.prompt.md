````prompt
---
description: 'Finalize CLI integration polish for seamless command support, perfect backward compatibility, and enhanced feature availability in the OAS validation system'
mode: 'agent'
tools: ['changes', 'codebase', 'editFiles', 'problems', 'search']
---

# Task 2: Finalize CLI Integration Polish and Seamless Command Support

Finalize the CLI integration polish to ensure seamless command support, perfect backward compatibility, and enhanced feature availability. Refine command parsing logic, validate all usage patterns, and ensure the CLI provides an excellent user experience for both legacy and enhanced validation modes.

You are completing Sprint 1 Task 2 for the Kibana OAS validation enhancement project. The CLI integration is functional but needs final polish to ensure seamless operation, proper command parsing, and comprehensive feature integration for production readiness.

## Critical Implementation Requirements

**MANDATORY Git Operations:**
1. You MUST run `yarn kbn bootstrap` after implementing any code changes
2. You MUST run `yarn kbn bootstrap` before testing script execution AND before running tests.
3. You MUST commit all changes to git with descriptive commit messages
4. You MUST test the implementation thoroughly before committing

**Files to Polish:**
- `src/platform/packages/private/kbn-validate-oas/index.ts`: Main CLI integration logic
- `src/platform/packages/private/kbn-validate-oas/src/cli_commands.ts`: Enhanced command handling
- `scripts/validate_oas_docs.js`: Legacy CLI entry point (maintain compatibility)
- `scripts/oas_enhanced_validation.js`: Enhanced CLI entry point (if needed)

## Steps

### 1. **Command Detection and Routing Analysis**
   - Analyze current command detection logic in index.ts
   - Validate command parsing for all enhanced mode variations
   - Ensure proper fallback to legacy mode for backward compatibility
   - Test edge cases with complex command-line argument combinations

### 2. **Enhanced Command Integration Polish**
   - Refine `runOASValidationCLI()` implementation for robust error handling
   - Ensure all enhanced features are accessible via command-line flags
   - Validate command argument parsing for all supported formats
   - Polish help text and usage examples for clarity

### 3. **Backward Compatibility Validation**
   - Verify all existing legacy command patterns continue to work
   - Test legacy flag combinations (`--path`, `--only`, etc.)
   - Ensure existing scripts and CI/CD integrations remain functional
   - Validate exit code behavior matches original implementation

### 4. **Command-Line Flag Integration**
   - Ensure seamless transition between legacy and enhanced mode flags
   - Implement intelligent flag validation and error messaging
   - Add helpful suggestions for migrating from legacy to enhanced commands
   - Polish command-line help text and examples

### 5. **Error Handling and User Experience**
   - Implement comprehensive error handling for invalid command combinations
   - Provide clear error messages with actionable suggestions
   - Ensure graceful fallback when enhanced features are unavailable
   - Add progress indicators and user-friendly output formatting

### 6. **Integration Testing and Validation**
   - Test all command-line usage patterns with real scenarios
   - Validate CLI behavior in different environments (CI, local development)
   - Ensure proper signal handling and process cleanup
   - Performance test command-line processing overhead

## Output Format

Provide implementation in these phases:

```typescript
// Phase 1: Enhanced command detection
const detectCommandMode = (args: string[]): 'legacy' | 'enhanced' => {
  // Improved logic for command detection
};

// Phase 2: Seamless integration logic
const integrateEnhancedCommands = (): void => {
  // Polish enhanced command integration
};

// Phase 3: Backward compatibility validation
const validateLegacyCompatibility = (): boolean => {
  // Ensure all legacy patterns work
};
```

## Examples

**Example 1: Enhanced Command Detection Logic**

Current command detection needs refinement:
```typescript
// BEFORE: Basic command detection
const hasCommand = args.length > 2 && ['base', 'enhanced'].includes(args[2]);

// AFTER: Comprehensive command detection
const detectCommandMode = (args: string[]): 'legacy' | 'enhanced' => {
  // Check for enhanced mode indicators
  if (args.includes('enhanced') || args.includes('--format') || args.includes('--incremental')) {
    return 'enhanced';
  }
  
  // Check for explicit base command
  if (args.includes('base')) {
    return 'enhanced'; // Use enhanced CLI but with base validation
  }
  
  // Default to legacy mode for backward compatibility
  return 'legacy';
};
```

**Example 2: Seamless Command Integration**

```typescript
// Enhanced CLI integration with proper error handling
const runEnhancedCLI = async (): Promise<void> => {
  try {
    const { runOASValidationCLI } = await import('./src/cli_commands');
    await runOASValidationCLI();
  } catch (error) {
    console.error('Enhanced CLI execution failed:', error.message);
    
    // Provide helpful guidance
    if (error.message.includes('command not found')) {
      console.error('Tip: Run "yarn kbn bootstrap" to rebuild dependencies');
    }
    
    process.exit(1);
  }
};
```

**Example 3: Backward Compatibility Testing**

```bash
# All these existing patterns MUST continue working:
node scripts/validate_oas_docs.js
node scripts/validate_oas_docs.js --only serverless
node scripts/validate_oas_docs.js --path /api/fleet --only traditional
node scripts/validate_oas_docs.js --help

# Enhanced patterns should work seamlessly:
node scripts/validate_oas_docs.js enhanced --format json
node scripts/validate_oas_docs.js enhanced --incremental --format github-comment
node scripts/validate_oas_docs.js base --format cli
```

**Example 4: Help Text Integration**

```typescript
const enhancedHelpText = `
Enhanced OAS Validation Features:
  node scripts/validate_oas_docs.js enhanced [options]
  
  Enhanced Options:
    --format <type>     Output format: cli, json, github-comment
    --incremental       Only validate changed files (requires git)
    --force             Force validation even when no changes detected
    --cache             Enable validation result caching
    --performance       Show performance metrics
    
  Migration Examples:
    Legacy:    node scripts/validate_oas_docs.js --only serverless
    Enhanced:  node scripts/validate_oas_docs.js enhanced --file.only serverless
`;
```

**Example 5: Robust Error Handling**

```typescript
const handleCLIError = (error: Error, mode: 'legacy' | 'enhanced'): void => {
  if (mode === 'enhanced') {
    console.error(`Enhanced validation failed: ${error.message}`);
    
    // Provide specific guidance based on error type
    if (error.message.includes('git')) {
      console.error('Tip: Ensure you are in a git repository for incremental validation');
    } else if (error.message.includes('bootstrap')) {
      console.error('Tip: Run "yarn kbn bootstrap" to rebuild dependencies');
    }
  } else {
    // Legacy error handling maintains original behavior
    console.error(`Validation failed: ${error.message}`);
  }
  
  process.exit(1);
};
```

**Example 6: Command Line Flag Validation**

```typescript
const validateCommandFlags = (args: string[]): { valid: boolean; message?: string } => {
  // Check for conflicting flags
  if (args.includes('--only') && args.includes('--file.only')) {
    return {
      valid: false,
      message: 'Cannot use both --only (legacy) and --file.only (enhanced) flags'
    };
  }
  
  // Check for enhanced features in legacy mode
  if (!args.includes('enhanced') && args.includes('--format')) {
    return {
      valid: false,
      message: 'Format option requires enhanced mode: node scripts/validate_oas_docs.js enhanced --format json'
    };
  }
  
  return { valid: true };
};
```

## Validation Criteria

**CLI Integration Completeness:**
- [ ] All command detection logic works correctly for edge cases
- [ ] Enhanced features are accessible via appropriate command-line flags
- [ ] Legacy command patterns maintain 100% backward compatibility
- [ ] Help text provides clear guidance for both legacy and enhanced usage
- [ ] Error messages are helpful and actionable

**User Experience Standards:**
- [ ] Command-line interface feels intuitive and consistent
- [ ] Error messages provide specific guidance for resolution
- [ ] Performance overhead of CLI processing is minimal (<100ms)
- [ ] Signal handling allows for graceful interruption
- [ ] Output formatting is consistent between modes

**Compatibility Requirements:**
- [ ] All existing CI/CD scripts continue to work without modification
- [ ] Legacy flag combinations produce identical behavior
- [ ] Exit codes match original implementation
- [ ] Environment variable handling maintains compatibility
- [ ] Process cleanup happens properly in all scenarios

**Feature Integration:**
- [ ] Enhanced features integrate seamlessly with command-line interface
- [ ] Flag validation prevents invalid command combinations
- [ ] Migration path from legacy to enhanced is clearly documented
- [ ] Performance features (caching, incremental) work via CLI
- [ ] Output formatting options are fully functional

# Notes

- Current implementation status: Basic CLI integration complete, needs polish for production readiness
- Focus areas: Command detection refinement, error handling improvement, backward compatibility validation
- Backward compatibility: 100% compatibility with existing usage patterns is mandatory
- Enhanced features: All new functionality must be accessible via command-line interface
- Error handling: Provide specific, actionable error messages for common issues
- Performance: CLI processing overhead should be minimal and not impact validation speed
- Documentation: Help text should guide users toward enhanced features while maintaining legacy support
- Testing approach: Validate all CLI patterns against real usage scenarios
- Signal handling: Proper cleanup when process is interrupted
- Environment compatibility: Works in CI/CD, local development, and container environments
````
