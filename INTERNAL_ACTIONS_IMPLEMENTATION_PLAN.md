# Implementation Plan: Internal Actions for Workflows

## Overview
Enable workflows to use both Elasticsearch and Kibana APIs through internal actions, starting with backend implementation.

## Backend Implementation Plan (Start Here)

### Phase 1: Core Backend Infrastructure

#### Task 1: **[BACKEND]** Add Internal Action Detection to StepFactory
- Update `StepFactory.create()` method
- Add detection for `elasticsearch.*` and `kibana.*` step types
- Route to new step implementations

```typescript
// In step_factory.ts
switch (stepType) {
  // ... existing cases
  default:
    // Check for internal actions
    if (stepType.startsWith('elasticsearch.')) {
      return new ElasticsearchActionStep(step, this.contextManager, this.workflowLogger);
    }
    if (stepType.startsWith('kibana.')) {
      return new KibanaActionStep(step, this.contextManager, this.workflowLogger);
    }
    throw new Error(`Unknown node type: ${stepType}`);
}
```

#### Task 2: **[BACKEND]** Add esClientAsUser to WorkflowContextManager
- Add `esClientAsUser` from core services
- Add `fakeRequest` storage for Kibana API authentication
- Provide access methods for step implementations

#### Task 3: **[BACKEND]** Add fakeRequest Propagation Through Task Runner
- Modify task runner to pass `fakeRequest` through container creation
- Update `createContainer` function signature
- Ensure context manager receives authentication context

### Phase 2: Spec Loading & Registry

#### Task 4: **[BACKEND]** Load ES API Specs from `/api/console/api_server`
**Integration with Console API:**
```typescript
// Create ES spec loader service
class ElasticsearchSpecLoader {
  async loadSpecs(): Promise<ESApiRegistry> {
    // GET /api/console/api_server to fetch ES API definitions
    const response = await fetch('kbn:/api/console/api_server');
    const specs = await response.json();
    return this.parseConsoleSpecs(specs);
  }
  
  private parseConsoleSpecs(specs: any): ESApiRegistry {
    // Parse Console's JSON spec format into our action registry
    // Map API endpoints to named actions
    // e.g., GET /_search -> elasticsearch.search.query
  }
}
```

#### Task 5: **[BACKEND]** Load Kibana API Specs from `oas_docs/output/kibana.yaml`
**Integration with OpenAPI:**
```typescript
// Create Kibana spec loader service  
class KibanaSpecLoader {
  async loadSpecs(): Promise<KibanaApiRegistry> {
    // Load OAS spec from file system
    const oasSpec = await fs.readFile('/oas_docs/output/kibana.yaml', 'utf8');
    const parsedSpec = yaml.parse(oasSpec);
    return this.parseOASSpecs(parsedSpec);
  }
  
  private parseOASSpecs(oas: OpenAPISpec): KibanaApiRegistry {
    // Parse OpenAPI paths into named actions
    // Map API paths to actions: POST /api/cases -> kibana.cases.create
    // Extract request/response schemas for validation
  }
}
```

#### Task 6: **[BACKEND]** Create Action Registry Using ES Console Specs
**ES Action Registry powered by Console specs:**
```typescript
interface ESActionDefinition {
  name: string;              // 'elasticsearch.search.query'
  method: string;            // 'search' 
  endpoint: string;          // '/_search'
  bodySchema?: any;          // From Console JSON specs
  paramSchema?: any;         // Query parameters
  consoleSpec: any;          // Original Console spec for reference
}

// Examples from Console specs:
const ES_ACTION_REGISTRY = {
  'elasticsearch.search.query': {
    method: 'search',
    endpoint: '/_search', 
    bodySchema: consoleSpecs.search.body,
    paramSchema: consoleSpecs.search.params,
  },
  'elasticsearch.indices.create': {
    method: 'indices.create',
    endpoint: '/{index}',
    bodySchema: consoleSpecs.indices.create.body,
  }
};
```

#### Task 7: **[BACKEND]** Create Action Registry Using Kibana OAS Specs
**Kibana Action Registry powered by OAS:**
```typescript
interface KibanaActionDefinition {
  name: string;              // 'kibana.cases.create'
  method: string;            // 'POST'
  path: string;              // '/api/cases'
  requestSchema?: any;       // From OAS request schema
  responseSchema?: any;      // From OAS response schema
  oasSpec: any;              // Original OAS spec for reference
}

// Examples from OAS specs:
const KIBANA_ACTION_REGISTRY = {
  'kibana.cases.create': {
    method: 'POST',
    path: '/api/cases',
    requestSchema: oasSchemas.CreateCaseRequest,
    responseSchema: oasSchemas.CreateCaseResponse,
  },
  'kibana.spaces.get': {
    method: 'GET', 
    path: '/api/spaces/space',
    responseSchema: oasSchemas.GetSpacesResponse,
  }
};
```

### Phase 3: Step Implementations

#### Task 8: **[BACKEND]** Create ElasticsearchActionStep Using Specs
```typescript
class ElasticsearchActionStep extends StepBase {
  async _run(): Promise<RunStepResult> {
    const actionDef = ES_ACTION_REGISTRY[this.step.type];
    
    // Validate against Console spec schema
    this.validateInput(this.step.with, actionDef.bodySchema);
    
    // Execute using esClientAsUser
    const esClient = this.contextManager.getEsClientAsUser();
    const result = await esClient[actionDef.method](this.step.with);
    
    return { output: result, error: undefined };
  }
}
```

#### Task 9: **[BACKEND]** Create KibanaActionStep Using Specs
```typescript
class KibanaActionStep extends StepBase {
  async _run(): Promise<RunStepResult> {
    const actionDef = KIBANA_ACTION_REGISTRY[this.step.type];
    
    // Validate against OAS schema
    this.validateInput(this.step.with, actionDef.requestSchema);
    
    // Execute HTTP call with API key
    const fakeRequest = this.contextManager.getFakeRequest();
    const result = await this.executeKibanaAPI(actionDef, this.step.with, fakeRequest);
    
    return { output: result, error: undefined };
  }
}
```

#### Task 10: **[BACKEND]** Implement Action Translation with Spec Validation

#### Task 11: **[BACKEND]** Implement Sugar Syntax Transformation
Transform user-friendly syntax into raw API calls:
```typescript
// Transform sugar syntax:
{
  index: "workflows_e2e",
  query: { term: { category: "news" } },
  size: 5
}

// Into raw API format:
{
  request: {
    method: "GET",
    path: "/workflows_e2e/_search", 
    body: {
      query: { term: { category: "news" } },
      size: 5
    }
  }
}
```
```typescript
class ActionTranslator {
  translateElasticsearch(actionName: string, params: any) {
    const actionDef = ES_ACTION_REGISTRY[actionName];
    if (!actionDef) throw new Error(`Unknown ES action: ${actionName}`);
    
    // Validate using Console spec
    this.validateConsoleSpec(params, actionDef.consoleSpec);
    
    return {
      method: actionDef.method,
      params: this.transformESParams(params, actionDef)
    };
  }
  
  translateKibana(actionName: string, params: any) {
    const actionDef = KIBANA_ACTION_REGISTRY[actionName];
    if (!actionDef) throw new Error(`Unknown Kibana action: ${actionName}`);
    
    // Validate using OAS schema
    this.validateOASSchema(params, actionDef.requestSchema);
    
    return {
      method: actionDef.method,
      path: actionDef.path,
      body: this.transformKibanaParams(params, actionDef)
    };
  }
}
```

---

## Frontend Implementation Plan (After Backend)

### Phase 4: YAML Editor Extensions

#### Task 11: **[FRONTEND]** Extend Completion Provider Architecture
- Modify `get_completion_item_provider.ts`
- Add detection for internal action contexts
- Route to appropriate completion providers

#### Task 12: **[FRONTEND]** ES API Autocompletion
- Import Console's JSON spec definitions
- Create completion items for `elasticsearch.*` actions
- Context-aware parameter suggestions

#### Task 13: **[FRONTEND]** Kibana API Autocompletion  
- Load OAS specifications from `oas_docs/output/kibana.yaml`
- Generate completion items for `kibana.*` actions
- API path and parameter suggestions

### Phase 5: Validation & Schema

#### Task 14: **[FRONTEND]** Schema Validation Integration
- Extend `useYamlValidation` hook
- Add validation for internal action parameters
- Real-time validation feedback

#### Task 15: **[FRONTEND]** Monaco Editor Enhancements
- Add syntax highlighting for internal actions
- Improve error display for validation issues
- Add hover documentation for actions

---

## Implementation Order & Dependencies

### **Backend First (Tasks 1-10)**
```
1. StepFactory updates → 2. Context Manager → 3. Task Runner → 4. ES Spec Loader → 5. Kibana Spec Loader → 6. ES Registry → 7. Kibana Registry → 8. ES Step → 9. Kibana Step → 10. Translation
```

### **Frontend Second (Tasks 11-15)**  
```
11. Completion Provider → 12. ES Completion → 13. Kibana Completion → 14. Validation → 15. UI Enhancements
```

## Key Integration Points

### **ES Integration via Console API:**
- Load specs from `GET kbn:/api/console/api_server`
- Use Console's JSON format for validation
- Map Console endpoints to named actions
- Leverage existing ES client method mapping

### **Kibana Integration via OAS:**
- Load specs from filesystem: `oas_docs/output/kibana.yaml` 
- Parse OpenAPI 3.0 spec format
- Generate request/response schemas
- Map OAS paths to named actions

### **Runtime Spec Loading:**
- Load specs at plugin startup
- Cache parsed registries in memory
- Hot-reload capability for development
- Error handling for spec loading failures

## Example Usage After Implementation

### Elasticsearch Actions:
```yaml
steps:
  - name: searchDocs
    type: elasticsearch.search.query
    with:
      index: "logs-*"
      query:
        match:
          message: "error"
      size: 100
```

### Kibana Actions:
```yaml  
steps:
  - name: createCase
    type: kibana.cases.create
    with:
      title: "High Priority Alert"
      description: "Found {{ steps.searchDocs.output.hits.total.value }} errors"
      tags: ["security", "high-priority"]
```

## Benefits

This approach ensures both the action registry and translation layer are **spec-driven** rather than hardcoded, providing:

1. **Accuracy**: Always in sync with actual API definitions
2. **Validation**: Proper schema validation using real specs  
3. **Completeness**: Access to all available APIs
4. **Maintainability**: Automatic updates when specs change
5. **Developer Experience**: Rich autocompletion and validation in YAML editor
6. **Authentication**: Proper user context through Task Manager API keys
7. **Simplicity**: Leverages existing StepFactory pattern with minimal architecture changes

---

## Implementation Status

### ✅ Completed Tasks

**Task 4: Load ES API Specs from Console Plugin**
- ✅ Created `ElasticsearchSpecsLoader` class to read 568+ ES API specifications
- ✅ Located specs at `/src/platform/plugins/shared/console/server/lib/spec_definitions/json/generated/`
- ✅ Implemented spec parsing and conversion to `ConnectorContract[]` format
- ✅ Added server route `/api/workflows/connectors/elasticsearch`

**Task 6: Create ES Action Registry**
- ✅ Generated full schema with individual literal types for each of 568+ APIs  
- ✅ Updated `generateYamlSchemaFromConnectors()` to handle large discriminated unions
- ✅ Created `/api/workflows/connectors/all` endpoint serving static + ES connectors

### 🔄 In Progress

**Frontend Integration Issues**
- ❌ **Dynamic Schema Loading Failed**: Attempted to load schemas dynamically in Monaco editor
- ❌ **Monaco Integration Problem**: React/TypeScript configuration conflicts prevented dynamic loading
- ❌ **Rollback Completed**: Restored static schema approach in `workflow_yaml_editor.tsx`

### 📋 Next Steps

**Alternative Approach - Build-Time Generation:**
1. **Generate Static Schemas**: Create build-time script to generate static schemas from ES specs
2. **Update Schema Files**: Replace hardcoded connectors with generated ES API definitions  
3. **Monaco Integration**: Use static schemas for editor validation and autocompletion
4. **Sugar Syntax**: Implement transformation rules for user-friendly syntax

**Files Modified:**
- `src/platform/plugins/shared/workflows_management/server/lib/elasticsearch_specs_loader.ts` - ES specs parser
- `src/platform/plugins/shared/workflows_management/server/routes/api/connectors_specs.ts` - API endpoints  
- `src/platform/plugins/shared/workflows_management/common/dynamic_schema.ts` - Frontend loading (rolled back)
- `src/platform/packages/shared/kbn-workflows/spec/lib/generate_yaml_schema.ts` - Schema generation

**Current Issue:**
Monaco editor still shows only hardcoded types (`elasticsearch.search`) instead of all 568+ ES APIs. Need build-time static generation approach instead of runtime dynamic loading.

**Lessons Learned:**
- Dynamic schema loading doesn't work well with Monaco editor's React integration
- TypeScript configuration prevents proper validation of dynamically loaded schemas
- Build-time generation is preferred approach for Monaco editor integration