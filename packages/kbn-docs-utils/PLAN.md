# Improve kbn-docs-utils validation and refactoring

## Overview

This plan focuses on improving code validation in `kbn-docs-utils` to ensure documented code meets JSDoc standards (per https://jsdoc.app/tags-param#parameters-with-properties) before documentation is built. The goal is to inform developers of issues early, not just generate documentation.

## Current State Analysis

The package currently:
- Builds API documentation from TypeScript using `ts-morph`
- Collects stats via `--stats` flag (any, comments, exports)
- Has integration tests with fixtures demonstrating various scenarios
- Validates missing comments, `any` types, and missing exports
- Handles destructured parameters but may not properly validate nested property JSDoc

Key files:
- [packages/kbn-docs-utils/src/build_api_docs_cli.ts](packages/kbn-docs-utils/src/build_api_docs_cli.ts) - Main CLI combining build and stats
- [packages/kbn-docs-utils/src/stats.ts](packages/kbn-docs-utils/src/stats.ts) - Stats collection logic
- [packages/kbn-docs-utils/src/build_api_declarations/build_parameter_decs.ts](packages/kbn-docs-utils/src/build_api_declarations/build_parameter_decs.ts) - Parameter extraction
- [packages/kbn-docs-utils/src/build_api_declarations/js_doc_utils.ts](packages/kbn-docs-utils/src/build_api_declarations/js_doc_utils.ts) - JSDoc parsing

## Phase 0: Baseline Documentation and Understanding ✅

### Phase 0.1: Document Current Behavior
- [x] Create `CURRENT_BEHAVIOR.md` documenting:
  - How `collectApiStatsForPlugin` works
  - What validation rules exist (missing comments, `any` types, missing exports)
  - How destructured parameters are currently handled
  - Known gaps (destructured params, property tags, etc.)
- [x] Document the flow: `build_api_docs_cli.ts` → `get_plugin_api_map` → `collectApiStatsForPlugin` → stats output

### Phase 0.2: Map Integration Test Fixtures to Validation Expectations
- [x] Add inline comments to [packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/fns.ts](packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/fns.ts):
  - Mark `crazyFunction` lines showing missing property-level JSDoc (should use `@param obj.hi`, `@param { fn1, fn2 }.fn1`, etc. per JSDoc spec)
  - Document which lines would be flagged as out-of-norm
- [x] Add comments to other fixture files:
  - [packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/classes.ts](packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/classes.ts) - Missing comments, `any` usage
  - [packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/index.ts](packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/index.ts) - `any` type usage
  - [packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/plugin.ts](packages/kbn-docs-utils/src/integration_tests/__fixtures__/src/plugin_a/public/plugin.ts) - Inline object parameters

### Phase 0.3: Run Existing Tests and Document Coverage
- [x] Run all unit tests: `mcp_Kibana_Dev_run_unit_tests` with package `@kbn/docs-utils`
- [x] Document current test coverage gaps
- [x] Identify which validation scenarios are not covered by tests

## Phase 1: Expand Test Coverage

### Phase 1.1: Unit Tests for Stats Collection
- [x] Create `src/stats.test.ts`:
  - Test `collectApiStatsForPlugin` with various scenarios
  - Test missing comment detection (including edge cases)
  - Test `any` type detection
  - Test missing exports detection
  - Test destructured parameter handling

### Phase 1.2: Unit Tests for Parameter Extraction
- [x] Expand `src/build_api_declarations/buid_api_declaration.test.ts`:
  - Test destructured parameter extraction
  - Test JSDoc property tag parsing (`@param obj.prop`)
  - Test nested destructured parameters
  - Test parameter comment matching

### Phase 1.3: Unit Tests for JSDoc Utilities
- [x] Create `src/build_api_declarations/js_doc_utils.test.ts`:
  - Test `getJSDocParamComment` with dot notation (`obj.prop`)
  - Test property-level parameter tags
  - Test nested property access patterns

### Phase 1.4: Integration Test Enhancements
- [x] Add test cases to [packages/kbn-docs-utils/src/integration_tests/api_doc_suite.test.ts](packages/kbn-docs-utils/src/integration_tests/api_doc_suite.test.ts):
  - Test that destructured params with proper JSDoc (`@param obj.prop`) are validated correctly
  - Test that missing property-level comments are detected
  - Test validation output format

## Phase 2: Refactor CLI into Modular Tasks

### Phase 2.1: Extract CLI Tasks
- [x] Create `src/cli/tasks/` directory structure
- [x] Extract tasks from `build_api_docs_cli.ts`:
  - `setup_project.ts` - Project initialization, plugin discovery, path resolution
  - `build_api_map.ts` - Building plugin API map
  - `collect_stats.ts` - Stats collection logic
  - `write_docs.ts` - Documentation writing
  - `report_metrics.ts` - CI metrics reporting
- [x] Create `src/cli/types.ts` for shared CLI types
- [x] Create `src/cli/parse_cli_flags.ts` for flag parsing logic

### Phase 2.2: Document and Test CLI Tasks
- [x] Add JSDoc comments to each task module
- [x] Create unit tests for each task:
  - `src/cli/tasks/setup_project.test.ts`
  - `src/cli/tasks/build_api_map.test.ts`
  - `src/cli/tasks/collect_stats.test.ts`
  - `src/cli/tasks/write_docs.test.ts`
  - `src/cli/tasks/report_metrics.test.ts`
- [x] Create `src/cli/parse_cli_flags.test.ts`

### Phase 2.3: Refactor Main CLI
- [x] Update [packages/kbn-docs-utils/src/build_api_docs_cli.ts](packages/kbn-docs-utils/src/build_api_docs_cli.ts) to use extracted tasks
- [x] Maintain backward compatibility
- [x] Ensure all existing functionality works (requires integration testing)

## Phase 3: Split Stats into Separate CLI

### Phase 3.1: Create Check Package Docs CLI
- [x] Create `src/cli/check_package_docs_cli.ts`:
  - Accept `--plugin` or `--package` flag (single or multiple), treating them as aliases
  - Accept validation flags: repeatable `--check` (any|comments|exports|all)
  - Output validation results (pass/fail per plugin)
  - Exit with non-zero code if validation fails
- [x] Create `src/cli/run_check_package_docs_cli.ts` wrapper
- [x] Export from [packages/kbn-docs-utils/index.ts](packages/kbn-docs-utils/index.ts)

### Phase 3.2: Update Build CLI
- [x] Keep `--stats` flag on `build_api_docs_cli.ts`, emit a deprecation warning, and route invocation to the new check CLI
- [x] Update help text and documentation to note deprecation and alias behavior
- [x] Ensure build-only mode works correctly

### Phase 3.3: Update Scripts and Documentation
- [x] Update [packages/kbn-docs-utils/src/README.md](packages/kbn-docs-utils/src/README.md) with new CLI usage
- [x] Document when to use `check_package_docs_cli` vs `build_api_docs_cli`
- [x] Update any scripts that use `--stats` flag

## Phase 4: Fix Bugs and Fill Gaps

### Phase 4.0: Refactor and Improve Tooling
- [x] Add `IssuesByPlugin` interface to [packages/kbn-docs-utils/src/types.ts](packages/kbn-docs-utils/src/types.ts) for extensible options
- [x] Refactor `collectApiStatsForPlugin` in [packages/kbn-docs-utils/src/stats.ts](packages/kbn-docs-utils/src/stats.ts) to use `IssuesByPlugin`
- [x] Add `hasCommentIssues` utility to [packages/kbn-docs-utils/src/stats.ts](packages/kbn-docs-utils/src/stats.ts)
- [x] Update [packages/kbn-docs-utils/src/README.md](packages/kbn-docs-utils/src/README.md) with comprehensive documentation
- [x] Add [packages/kbn-docs-utils/scripts/update_fixture_comments.js](packages/kbn-docs-utils/scripts/update_fixture_comments.js) for fixture maintenance

### Phase 4.1: Fix Destructured Parameter Validation
- [x] Update `getJSDocParamComment` in [packages/kbn-docs-utils/src/build_api_declarations/js_doc_utils.ts](packages/kbn-docs-utils/src/build_api_declarations/js_doc_utils.ts):
  - Support dot notation (`obj.prop`) for property-level tags
  - Handle nested property access (`obj.nested.prop`)
  - Match JSDoc spec: https://jsdoc.app/tags-param#parameters-with-properties
- [x] Update `buildApiDecsForParameters` in [packages/kbn-docs-utils/src/build_api_declarations/build_parameter_decs.ts](packages/kbn-docs-utils/src/build_api_declarations/build_parameter_decs.ts):
  - For destructured params, check for property-level JSDoc tags
  - Only flag missing comments if parent param AND property-level tags are missing
  - Handle nested destructuring patterns

### Phase 4.2: ReactElement Signature Skipped Test
- [x] Unskip and fix `Test ReactElement signature` in [packages/kbn-docs-utils/src/build_api_declarations/build_api_declaration.test.ts](packages/kbn-docs-utils/src/build_api_declarations/build_api_declaration.test.ts)
- [x] Implement or adjust handling for ReactElement signatures to satisfy the test

### Phase 4.3: Improve Missing Comments Detection
- [x] Update `collectStatsForApi` in [packages/kbn-docs-utils/src/stats.ts](packages/kbn-docs-utils/src/stats.ts):
  - For destructured parameters, check if parent has comment OR properties have individual comments
  - Don't flag as missing if property-level JSDoc exists
  - Add validation for required vs. optional parameter documentation

### Phase 4.4: Add Checks for @returns Tags
- [ ] Add `missingReturns` field to `ApiStats` in [packages/kbn-docs-utils/src/types.ts](packages/kbn-docs-utils/src/types.ts)
- [ ] Add `trackMissingReturns` function in [packages/kbn-docs-utils/src/stats.ts](packages/kbn-docs-utils/src/stats.ts)
- [ ] Extend `hasCommentIssues` to include `missingReturns`
- [ ] Update mocks and fixture "Expected issues" blocks

### Phase 4.5: Add Param Doc Mismatch Checks
- [ ] Add `paramDocMismatches` field to `ApiStats` in [packages/kbn-docs-utils/src/types.ts](packages/kbn-docs-utils/src/types.ts)
- [ ] Add `trackParamDocMismatches` function in [packages/kbn-docs-utils/src/stats.ts](packages/kbn-docs-utils/src/stats.ts)
- [ ] Extend `hasCommentIssues` to include `paramDocMismatches`
- [ ] Update mocks and fixture "Expected issues" blocks

### Phase 4.6: Add Complex Type Info Checks
- [ ] Add `missingComplexTypeInfo` field to `ApiStats` in [packages/kbn-docs-utils/src/types.ts](packages/kbn-docs-utils/src/types.ts)
- [ ] Add `trackMissingComplexTypeInfo` function in [packages/kbn-docs-utils/src/stats.ts](packages/kbn-docs-utils/src/stats.ts)
- [ ] Extend `hasCommentIssues` to include `missingComplexTypeInfo`
- [ ] Update mocks and fixture "Expected issues" blocks

### Phase 4.7: Improve Multiple Call Signature Validation
- [x] Handle interfaces with multiple call signatures
- [x] Extract parameter documentation from first overload signature
- [x] Add test cases for overloaded functions

### Phase 4.8: Unnamed Exports Validator
- [x] Add `UnnamedExport` type to [packages/kbn-docs-utils/src/types.ts](packages/kbn-docs-utils/src/types.ts)
- [x] Extend `IssuesByPlugin` with optional `unnamedExports` field
- [x] Update `getDeclarationNodesForPluginScope` in [packages/kbn-docs-utils/src/get_declaration_nodes_for_plugin.ts](packages/kbn-docs-utils/src/get_declaration_nodes_for_plugin.ts) to detect unnamed exports
- [x] Update `getPluginApi` in [packages/kbn-docs-utils/src/get_plugin_api.ts](packages/kbn-docs-utils/src/get_plugin_api.ts) to propagate unnamed exports
- [x] Add `--check unnamed` CLI flag
- [x] Add tests for unnamed export detection

## Phase 5: CLI Output Improvements
- [x] Improve `getLink` in [packages/kbn-docs-utils/src/cli/tasks/report_metrics.ts](packages/kbn-docs-utils/src/cli/tasks/report_metrics.ts) to use line numbers when available
- [x] Add `printIssueTable` helper for consistent output formatting
- [x] Add `printMissingExportsTable` helper for missing exports output
- [x] Refactor existing console output to use helper functions

## Phase 6: Flat Stats Output and MCP Auto-Fix Tooling

### Phase 6.1: Emit Flat Stats File
- [ ] Add `--write` CLI flag to `check_package_docs` to emit validation stats as a flat JSON file
- [ ] Write stats to each plugin's `target/api_docs/stats.json` (follows Kibana convention for build artifacts)
- [ ] Include line-anchored GitHub URLs when line numbers are present
- [ ] Stats include counts and detailed entries for: missing comments, any types, no references, missing returns, param doc mismatches, missing complex type info, and missing exports

### Phase 6.2: MCP Tools for Documentation Checking and Fixing
- [ ] Create `check_package_docs` MCP tool for quick validation checks
- [ ] Create `fix_package_docs` MCP tool for detailed issue reporting with code snippets
- [ ] Both tools registered in `kbn-mcp-dev-server`
- [ ] Add usage docs and basic tests for the MCP tools

## Phase 7: Improve Performance of Single Package Builds and Validation

### Phase 7.1: Optimize TypeScript Project Loading
- [ ] Update `getTsProject` in [packages/kbn-docs-utils/src/cli/tasks/setup_project.ts](packages/kbn-docs-utils/src/cli/tasks/setup_project.ts):
  - For single-plugin builds, only load source files from the target plugin directory
  - Skip `resolveSourceFileDependencies()` for single-plugin builds; rely on lazy resolution
- [ ] Add `allPlugins` to `SetupProjectResult` for cross-reference resolution

### Phase 7.2: Optimize Documentation Writing
- [ ] Update `writeDocs` in [packages/kbn-docs-utils/src/cli/tasks/write_docs.ts](packages/kbn-docs-utils/src/cli/tasks/write_docs.ts):
  - Skip aggregate docs (plugin directory, deprecation summaries) for filtered builds
  - Move deprecation doc writing outside the per-plugin loop

### Phase 7.3: Handle Cross-References in Single-Package Builds
- [ ] Update `removeBrokenLinksFromApi` in [packages/kbn-docs-utils/src/utils.ts](packages/kbn-docs-utils/src/utils.ts):
  - When validating cross-package links, keep references as-is if the target plugin isn't loaded

### Phase 7.4: Update Tests
- [ ] Update [packages/kbn-docs-utils/src/cli/tasks/setup_project.test.ts](packages/kbn-docs-utils/src/cli/tasks/setup_project.test.ts) with single-plugin tests
- [ ] Update other affected test files

## Phase 8: APM Metrics for New Validation Fields
- [ ] Add APM metrics for `missingReturns` count
- [ ] Add APM metrics for `paramDocMismatches` count
- [ ] Add APM metrics for `missingComplexTypeInfo` count
- [ ] Update `passesAllChecks` logic to include new fields
- [ ] Add CLI output for new validation fields under `comments` option

## Implementation Notes

- Each phase can be tackled independently by an agent
- Phases should be completed in order (0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8)
- Tests should be written before implementing fixes (TDD approach for Phase 4)
- Maintain backward compatibility throughout
- Use existing patterns and conventions from the codebase

## Related Documentation

- [CURRENT_BEHAVIOR.md](./CURRENT_BEHAVIOR.md) - Current system behavior and flow

