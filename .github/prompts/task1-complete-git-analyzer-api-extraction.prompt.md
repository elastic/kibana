````prompt
---
description: 'Complete API path extraction implementation in GitDiffAnalyzer for accurate incremental OAS validation based on Kibana route patterns and plugin architecture'
mode: 'agent'
tools: ['changes', 'codebase', 'editFiles', 'problems', 'search']
---

# Task 1: Complete Git Analyzer API Path Extraction Implementation

Implement complete API path extraction from Kibana route files and expand plugin-to-API path mappings to cover the entire Kibana ecosystem. Analyze Kibana's route registration patterns and plugin architecture to build comprehensive mappings for accurate incremental OAS validation.

You are completing Sprint 1 Task 1 for the Kibana OAS validation enhancement project. The GitDiffAnalyzer currently has placeholder implementations for API path extraction and plugin mapping. You MUST implement the complete functionality to enable accurate incremental validation based on git changes.

## Critical Implementation Requirements

**MANDATORY Git Operations:**
1. You MUST run `yarn kbn bootstrap` after implementing any code changes
2. You MUST commit all changes to git with descriptive commit messages
3. You MUST test the implementation thoroughly before committing

**Implementation Files to Complete:**
- `src/platform/packages/private/kbn-validate-oas/src/git_diff_analyzer.ts`: Main implementation file
- Related test files as needed for comprehensive testing

## Steps

### 1. **Kibana Route Pattern Analysis**
   - Analyze route registration patterns across Kibana core and X-Pack plugins
   - Identify different route definition styles (router.get, router.post, etc.)
   - Examine versioned API patterns using `@kbn/core-http-router-server-mocks`
   - Study route file naming conventions and directory structures

### 2. **Plugin Architecture Discovery**
   - Map plugin directory structures to their API route definitions
   - Identify plugin entry points and route registration mechanisms
   - Analyze plugin dependencies and shared route patterns
   - Document plugin categorization (core, x-pack solutions, examples)

### 3. **API Path Extraction Implementation**
   - Implement `extractApiPathsFromRouteFiles()` method with TypeScript AST parsing
   - Handle different route registration patterns and syntaxes
   - Extract path parameters, HTTP methods, and API versions
   - Build comprehensive route-to-file mapping database with caching

### 4. **Plugin-to-API Mapping Expansion**
   - Complete `mapPluginToApiPaths()` method implementation
   - Create comprehensive plugin discovery system
   - Map plugin source files to their generated API routes
   - Handle edge cases like shared utilities and cross-plugin dependencies
   - Implement performance-optimized caching

### 5. **Enhanced Git Change Analysis**
   - Improve `extractAffectedApiPaths()` method to use actual API extraction
   - Implement intelligent mapping from changed files to affected API paths
   - Add confidence scoring for path mappings (high/medium/low)
   - Handle complex dependency chains and shared code impacts

### 6. **Testing and Validation**
   - Create comprehensive test cases for new extraction logic
   - Test against real Kibana plugin structures and route files
   - Validate mapping accuracy with known plugin-to-API relationships
   - Performance test with large changesets and complex plugin structures

## Output Format

Provide implementation in these phases:

```typescript
// Phase 1: Enhanced interface definitions
interface RouteParsingResult {
  routes: ParsedRouteInfo[];
  confidence: 'high' | 'medium' | 'low';
  parsingErrors: string[];
  filePath: string;
  lastModified: number;
}

// Phase 2: Core extraction methods
class GitDiffAnalyzer {
  private extractApiPathsFromRouteFiles(filePaths: string[]): RouteParsingResult[]
  private mapPluginToApiPaths(pluginPath: string): PluginRouteMapping
  private parseRouteDefinition(content: string, filePath: string): ParsedRouteInfo[]
  
  // Phase 3: Enhanced analysis methods
  private extractAffectedApiPaths(changes: GitChange[]): string[]
  private calculateMappingConfidence(mapping: PluginRouteMapping): number
}
```

## Examples

**Example 1: Route Pattern Analysis**

Analyze these common Kibana route patterns:
```typescript
// Fleet plugin route pattern
router.get({
  path: '/api/fleet/agent_policies',
  validate: { query: schema.object({}) },
}, handler);

// Security Solution route pattern  
router.post({
  path: '/api/detection_engine/rules',
  validate: { body: schema.object({}) },
  options: { authRequired: true }
}, handler);

// Versioned API pattern
router.versioned.get({
  access: 'public',
  path: '/api/cases/{case_id}',
}).addVersion({
  version: '2023-10-31',
  validate: {}
}, handler);
```

**Expected extraction result:**
```typescript
const routeInfo: ParsedRouteInfo = {
  method: 'GET',
  path: '/api/fleet/agent_policies',
  isVersioned: false,
  isPublic: true
};
```

**Example 2: Plugin Discovery Implementation**

```typescript
private mapPluginToApiPaths(pluginPath: string): PluginRouteMapping {
  // Discover plugin structure
  const pluginName = this.extractPluginName(pluginPath);
  const routeFiles = this.findRouteFiles(pluginPath);
  const extractedRoutes = this.extractApiPathsFromRouteFiles(routeFiles);
  
  return {
    pluginName,
    pluginPath,
    apiPaths: extractedRoutes.flatMap(r => r.routes.map(route => route.path)),
    confidence: this.calculateConfidence(extractedRoutes),
    source: 'parsed'
  };
}
```

**Example 3: Enhanced Change Analysis**

```typescript
private extractAffectedApiPaths(changes: GitChange[]): string[] {
  const affectedPaths: string[] = [];
  
  for (const change of changes) {
    if (this.isRouteFile(change.filePath)) {
      // Direct route file change
      const routes = this.extractApiPathsFromRouteFiles([change.filePath]);
      affectedPaths.push(...routes.flatMap(r => r.routes.map(route => route.path)));
    } else {
      // Indirect change - map through plugin structure
      const pluginMapping = this.mapPluginToApiPaths(this.getPluginRoot(change.filePath));
      affectedPaths.push(...pluginMapping.apiPaths);
    }
  }
  
  return [...new Set(affectedPaths)]; // Deduplicate
}
```

**Example 4: TypeScript AST Route Parsing**

```typescript
private parseRouteDefinition(content: string, filePath: string): ParsedRouteInfo[] {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest);
  const routes: ParsedRouteInfo[] = [];
  
  const visit = (node: ts.Node) => {
    // Look for router.get, router.post, etc. call expressions
    if (ts.isCallExpression(node) && this.isRouteRegistration(node)) {
      const routeInfo = this.extractRouteInfo(node);
      if (routeInfo) routes.push(routeInfo);
    }
    ts.forEachChild(node, visit);
  };
  
  visit(sourceFile);
  return routes;
}
```

## Validation Criteria

**Implementation Completeness:**
- [ ] All placeholder methods have full implementations
- [ ] TypeScript AST parsing correctly extracts route definitions
- [ ] Plugin discovery covers core, x-pack, and example plugins
- [ ] Caching mechanisms improve performance on repeated operations
- [ ] Error handling for malformed routes and missing files

**Accuracy Requirements:**
- [ ] Route extraction accuracy >95% on known Kibana patterns
- [ ] Plugin mapping covers >90% of active plugins in repository
- [ ] API path extraction handles versioned and non-versioned routes
- [ ] Change analysis correctly identifies direct and indirect impacts

**Performance Standards:**
- [ ] Route parsing completes within 5 seconds for typical plugin
- [ ] Plugin mapping uses caching to avoid re-parsing unchanged files
- [ ] Git change analysis processes 100+ file changes within 10 seconds
- [ ] Memory usage remains under 500MB for full repository analysis

# Notes

- Current implementation status: Core functionality complete, API extraction has placeholder implementations
- Focus areas: TypeScript AST parsing, plugin discovery automation, intelligent change mapping
- Git integration: System must accurately determine which API paths need validation based on file changes
- Performance critical: Incremental validation only valuable if faster than full validation
- Testing approach: Use real Kibana plugins and route structures for validation
- Caching strategy: File modification times to avoid re-parsing unchanged route files
- Error handling: Graceful degradation when route parsing fails (fall back to full validation)
- Plugin types: Core platform, X-Pack solutions, examples, and community plugins
- Route patterns: Standard routes, versioned APIs, public/internal classification
- Dependency mapping: Shared utilities and cross-plugin imports affect multiple API paths
````
