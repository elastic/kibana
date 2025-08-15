# Sprint 1: Technical Specifications for OAS Quality Automation
*Completing Phase 2 - Detailed Implementation Specifications*

## Overview

Sprint 1 focuses on enhancing the existing CLI tool (`scripts/validate_oas_docs.js`) with automation capabilities for GitHub PR feedback. This document provides comprehensive technical specifications to guide implementation.

---

## Current Infrastructure Analysis

### Existing CLI Tool Structure
**File**: `scripts/validate_oas_docs.js` 
**Current Functionality**:
- Simple wrapper that requires `@kbn/validate-oas` package
- Basic validation of pre-generated OAS bundles

**Current Package**: `src/platform/packages/private/kbn-validate-oas/index.ts`
**Current Capabilities**:
- Uses `@seriousme/openapi-schema-validator` for schema validation
- Supports path filtering (`--path` flag)
- Supports offering-specific validation (`--only traditional|serverless`)
- Validates pre-built YAML files in `oas_docs/output/`
- Built on `@kbn/dev-cli-runner` framework

### Integration Points
**Buildkite Integration**: `.buildkite/scripts/steps/checks/capture_oas_snapshot.sh`
- Uses bootstrap and ES snapshot setup
- Runs capture_oas_snapshot with specific API paths
- Includes update mechanism for PRs (`--update` flag)
- Handles serverless/traditional variants

---

## Sprint 1 Enhancement Specifications

### Issue #231222: CLI Tool Enhancement

#### 1. **Enhanced Argument Parser**
```typescript
interface CLIOptions {
  // Existing flags (maintain backward compatibility)
  path?: string[];
  only?: 'traditional' | 'serverless';
  
  // New automation flags
  files?: string[];           // Custom file selection
  output?: OutputFormat;      // Structured output format
  incremental?: boolean;      // Only validate changed files
  severity?: SeverityLevel;   // Filter by severity
  format?: string;           // Output template format
  quiet?: boolean;           // Suppress console output
  config?: string;           // Custom config file path
}

type OutputFormat = 'json' | 'markdown' | 'github-comment' | 'text';
type SeverityLevel = 'error' | 'warning' | 'info' | 'all';
```

#### 2. **File Selection Enhancement**
```typescript
interface FileSelector {
  /**
   * Select OAS files for validation
   * Supports glob patterns and git diff integration
   */
  selectFiles(options: {
    patterns?: string[];
    incrementalMode?: boolean;
    baseBranch?: string;
  }): Promise<string[]>;
  
  /**
   * Detect changed OAS files in PR context
   */
  detectChangedOASFiles(baseBranch: string): Promise<string[]>;
}

// Implementation approach:
// 1. Extend existing CLI to accept --files flag with glob patterns
// 2. Add git integration for --incremental mode
// 3. Maintain compatibility with existing --path filtering
```

#### 3. **Enhanced Validation Engine**
```typescript
interface ValidationEngine {
  /**
   * Run validation with enhanced options
   */
  validate(files: string[], options: ValidationOptions): Promise<ValidationResult>;
  
  /**
   * Apply configurable rules and filters
   */
  applyRules(results: RawValidationResult[], rules: ValidationRule[]): ValidationResult;
}

interface ValidationOptions {
  rules?: ValidationRule[];
  severity?: SeverityLevel;
  outputFormat?: OutputFormat;
  includeMetadata?: boolean;
}

interface ValidationRule {
  id: string;
  name: string;
  severity: SeverityLevel;
  enabled: boolean;
  configuration?: Record<string, any>;
}
```

#### 4. **Configuration System**
```typescript
interface ValidationConfig {
  rules: ValidationRule[];
  outputTemplates: Record<string, OutputTemplate>;
  defaultSeverity: SeverityLevel;
  ignorePatterns: string[];
  customMessages: Record<string, string>;
}

// Configuration sources (priority order):
// 1. CLI flags (highest priority)
// 2. Project config file (.oas-validation.json)
// 3. Package defaults (lowest priority)

// Example config file:
{
  "rules": [
    {
      "id": "missing-description",
      "severity": "warning",
      "enabled": true
    },
    {
      "id": "missing-examples", 
      "severity": "info",
      "enabled": true
    }
  ],
  "outputTemplates": {
    "github-comment": "./templates/github-pr-comment.md"
  },
  "ignorePatterns": ["**/internal/**", "**/test/**"]
}
```

### Issue #231223: Output Formatting

#### 1. **Structured Output Schema**
```typescript
interface ValidationResult {
  summary: ValidationSummary;
  issues: ValidationIssue[];
  metadata: ValidationMetadata;
  files: FileValidationResult[];
}

interface ValidationSummary {
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  validationTime: number;
  success: boolean;
}

interface ValidationIssue {
  id: string;
  file: string;
  path: string;               // JSON path in OAS file
  line?: number;              // Line number if available
  column?: number;            // Column number if available
  rule: string;               // Rule that triggered the issue
  severity: SeverityLevel;
  message: string;
  suggestion?: string;        // Actionable improvement suggestion
  documentationUrl?: string;  // Link to guidelines
}

interface ValidationMetadata {
  timestamp: string;
  kibanaVersion: string;
  cliVersion: string;
  rulesApplied: string[];
  gitContext?: GitContext;
}

interface GitContext {
  branch: string;
  commit: string;
  baseBranch?: string;
  changedFiles?: string[];
}
```

#### 2. **Output Format Templates**

##### JSON Output (for CI integration)
```json
{
  "summary": {
    "totalFiles": 3,
    "filesWithIssues": 2,
    "totalIssues": 5,
    "errorCount": 1,
    "warningCount": 3,
    "infoCount": 1,
    "validationTime": 1234,
    "success": false
  },
  "issues": [
    {
      "id": "missing-description-001",
      "file": "oas_docs/output/kibana.yaml",
      "path": "/paths/~1api~1spaces/get/description",
      "line": 245,
      "rule": "missing-description",
      "severity": "warning",
      "message": "Path operation is missing a description",
      "suggestion": "Add a clear description explaining what this endpoint does",
      "documentationUrl": "https://docs.elastic.dev/kibana-dev-docs/api-design-guidelines#descriptions"
    }
  ],
  "metadata": {
    "timestamp": "2025-08-11T14:30:00Z",
    "kibanaVersion": "8.15.0",
    "cliVersion": "1.1.0",
    "rulesApplied": ["missing-description", "missing-examples"],
    "gitContext": {
      "branch": "feature/my-api",
      "commit": "abc123",
      "baseBranch": "main",
      "changedFiles": ["oas_docs/output/kibana.yaml"]
    }
  }
}
```

##### GitHub Comment Template (Markdown)
```markdown
## 🔍 OAS Quality Validation Results

### Summary
- **Files Validated**: 3
- **Issues Found**: 5 (1 error, 3 warnings, 1 info)
- **Files with Issues**: 2
- **Overall Status**: ❌ Failed

### Issues by File

#### `oas_docs/output/kibana.yaml`
**⚠️ 3 warnings, 1 info**

| Line | Path | Issue | Suggestion |
|------|------|-------|------------|
| 245 | `/paths/~1api~1spaces/get` | Missing description | Add a clear description explaining what this endpoint does |
| 312 | `/paths/~1api~1fleet/post/responses/200` | Missing example | Provide a realistic response example |

#### `oas_docs/output/kibana.serverless.yaml`  
**❌ 1 error**

| Line | Path | Issue | Suggestion |
|------|------|-------|------------|
| 156 | `/components/schemas/UserProfile` | Invalid schema | Fix required property definition |

### How to Fix

1. **Missing descriptions**: Add clear, concise descriptions to all path operations and parameters
2. **Missing examples**: Provide realistic examples for request/response bodies
3. **Schema issues**: Ensure all schema definitions follow OpenAPI 3.0 specification

### Resources
- [Kibana API Design Guidelines](https://docs.elastic.dev/kibana-dev-docs/api-design-guidelines)
- [OpenAPI Best Practices](https://elastic.github.io/oas-guidelines/)

---
*Generated by OAS Quality Validator v1.1.0 | [Learn more](https://github.com/elastic/kibana/tree/main/scripts/validate_oas_docs.js)*
```

#### 3. **Output Format Implementation**
```typescript
interface OutputFormatter {
  format(result: ValidationResult, template: OutputFormat): string;
  
  // Specific formatters
  formatAsJSON(result: ValidationResult): string;
  formatAsMarkdown(result: ValidationResult): string;
  formatAsGitHubComment(result: ValidationResult): string;
  formatAsText(result: ValidationResult): string;
}

// Template system support
interface OutputTemplate {
  name: string;
  format: OutputFormat;
  template: string;
  variables: string[];
}
```

### Issue #231224: Incremental Validation

#### 1. **Git Integration**
```typescript
interface GitHandler {
  /**
   * Get list of changed files between branches
   */
  getChangedFiles(baseBranch: string, targetBranch?: string): Promise<string[]>;
  
  /**
   * Filter for OAS-related files only
   */
  filterOASFiles(files: string[]): string[];
  
  /**
   * Get current git context for metadata
   */
  getGitContext(): Promise<GitContext>;
}

// File patterns to detect OAS changes:
const OAS_FILE_PATTERNS = [
  'oas_docs/**/*.yaml',
  'oas_docs/**/*.yml', 
  'oas_docs/**/*.json',
  '**/*.oas.yaml',
  '**/*.openapi.yaml'
];
```

#### 2. **Caching Strategy**
```typescript
interface ValidationCache {
  /**
   * Get cached validation result for file
   */
  get(fileHash: string): Promise<ValidationResult | null>;
  
  /**
   * Store validation result
   */
  set(fileHash: string, result: ValidationResult): Promise<void>;
  
  /**
   * Calculate file hash for cache key
   */
  calculateHash(filePath: string): Promise<string>;
  
  /**
   * Clear expired cache entries
   */
  cleanup(): Promise<void>;
}

interface CacheConfig {
  enabled: boolean;
  ttl: number;           // Time to live in milliseconds
  maxSize: number;       // Maximum cache entries
  storage: 'memory' | 'file' | 'redis';
  cacheDir?: string;     // For file-based cache
}

// Cache implementation approach:
// 1. Hash file content + rules configuration
// 2. Store in .oas-validation-cache/ directory
// 3. 70%+ hit rate target for repeated builds
// 4. Automatic cleanup of expired entries
```

#### 3. **Performance Optimization**
```typescript
interface PerformanceOptions {
  parallel: boolean;        // Validate files in parallel
  maxConcurrency: number;   // Limit concurrent validations
  timeout: number;          // Validation timeout per file
  memoryLimit: number;      // Memory usage limit
}

// Performance targets:
// - Incremental validation: < 30 seconds for typical PR
// - Full validation: < 2 minutes for entire codebase
// - Cache hit rate: 70%+ for repeated builds
// - Memory usage: < 512MB peak
```

---

## Implementation Plan

### Week 1: CLI Enhancement Foundation
**Days 1-2**: Examine and refactor existing CLI structure
- Set up enhanced argument parsing with backward compatibility
- Implement file selection logic with glob support
- Add configuration system foundation

**Days 3-5**: Core validation enhancement
- Extend validation engine with new options
- Implement structured output schema
- Add basic error handling and logging

### Week 2: Output Formatting System
**Days 1-3**: Output formatter implementation
- Create JSON output formatter
- Implement markdown template system
- Design GitHub comment format

**Days 4-5**: Template and configuration system
- Add configurable output templates
- Implement rule configuration system
- Create default configuration files

### Week 3: Incremental Validation & Testing
**Days 1-3**: Git integration and caching
- Implement git change detection
- Add caching layer with file hashing
- Performance optimization for large repositories

**Days 4-5**: Testing and validation
- Comprehensive unit testing
- Integration testing with real Kibana OAS files
- Performance benchmarking and optimization

---

## Testing Strategy

### Unit Tests
```typescript
describe('Enhanced CLI Tool', () => {
  describe('File Selection', () => {
    it('should select files based on glob patterns');
    it('should detect changed files in incremental mode');
    it('should handle non-existent files gracefully');
  });
  
  describe('Output Formatting', () => {
    it('should format JSON output correctly');
    it('should generate valid markdown');
    it('should create GitHub comment format');
  });
  
  describe('Caching', () => {
    it('should cache validation results');
    it('should invalidate cache on file changes');
    it('should respect TTL settings');
  });
});
```

### Integration Tests
```typescript
describe('CLI Integration', () => {
  it('should validate real Kibana OAS files');
  it('should handle incremental validation on PR branch');
  it('should generate proper output for CI consumption');
  it('should maintain backward compatibility');
});
```

### Performance Tests
```typescript
describe('Performance', () => {
  it('should complete incremental validation under 30s');
  it('should achieve 70%+ cache hit rate');
  it('should handle large OAS files efficiently');
  it('should limit memory usage under 512MB');
});
```

---

## Success Criteria for Sprint 1

### Functional Requirements ✅
- [ ] Enhanced CLI accepts new automation flags
- [ ] File selection works with glob patterns and git integration
- [ ] Structured output formats (JSON, markdown, GitHub comment)
- [ ] Incremental validation detects and processes only changed files
- [ ] Configuration system allows rule customization
- [ ] Backward compatibility maintained with existing usage

### Performance Requirements ✅
- [ ] Incremental validation completes in < 30 seconds for typical PR
- [ ] Cache achieves 70%+ hit rate for repeated validations
- [ ] Memory usage stays under 512MB peak
- [ ] Full validation completes in < 2 minutes

### Quality Requirements ✅
- [ ] Comprehensive unit test coverage (>90%)
- [ ] Integration tests with real Kibana OAS files
- [ ] Error handling for malformed files and network issues
- [ ] Clear, actionable error messages and suggestions

### Documentation Requirements ✅
- [ ] Updated CLI help text and examples
- [ ] Configuration file schema documentation
- [ ] Output format specifications
- [ ] Integration guide for CI/CD usage

---

## Next Steps After Sprint 1

Once Sprint 1 is complete, the enhanced CLI tool will be ready for:
- **Sprint 2**: Buildkite CI integration and GitHub PR automation
- **Sprint 3**: Advanced features like custom rules and VS Code integration
- **Sprint 4**: Monitoring, metrics, and continuous improvement

This foundation provides all the necessary automation capabilities for the subsequent phases of the OAS Quality Automation project.
