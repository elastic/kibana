# Architecture Document: Internal Connector for Workflows

## Overview

The Internal Connector feature extends the workflows system to support direct interaction with Kibana and Elasticsearch APIs. This document outlines the technical architecture, components, and implementation approach for this feature.

## Architecture Principles

### 1. Leverage Existing Infrastructure
- Reuse Console plugin's autocomplete infrastructure
- Integrate with existing workflow execution engine
- Maintain consistency with Kibana's security model

### 2. Dynamic Discovery
- Automatically discover available API endpoints
- Generate autocomplete suggestions dynamically
- Support API schema evolution

### 3. Performance & Scalability
- Efficient caching of API schemas
- Support for concurrent executions
- Minimal impact on overall system performance

### 4. Security First
- Inherit existing authentication mechanisms
- Respect role-based access control
- Comprehensive audit logging

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Management                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Workflow      │  │   Workflow      │  │   Workflow      │  │
│  │   Definition    │  │   Execution     │  │   Monitoring    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Internal Connector Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Request       │  │   Autocomplete  │  │   Schema        │  │
│  │   Handler       │  │   Engine        │  │   Manager       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Console Integration                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Autocomplete  │  │   API Schema    │  │   Request       │  │
│  │   Infrastructure│  │   Definitions   │  │   Validation    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kibana Core Services                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   HTTP Service  │  │   Security      │  │   Audit         │  │
│  │                 │  │   Plugin        │  │   Service       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Internal Connector Plugin

#### Core Components

**InternalConnectorPlugin**
```typescript
export class InternalConnectorPlugin implements Plugin {
  private readonly autocompleteEngine: AutocompleteEngine;
  private readonly schemaManager: SchemaManager;
  private readonly requestHandler: RequestHandler;

  setup(core: CoreSetup) {
    // Register connector type
    // Setup autocomplete integration
    // Initialize schema manager
  }

  start(core: CoreStart) {
    // Start autocomplete engine
    // Initialize request handler
    // Setup monitoring
  }
}
```

**RequestHandler**
```typescript
export class RequestHandler {
  async executeRequest(
    request: InternalConnectorRequest,
    context: WorkflowExecutionContext
  ): Promise<InternalConnectorResponse> {
    // Validate request
    // Apply security policies
    // Execute HTTP request
    // Parse response
    // Handle errors
  }
}
```

**AutocompleteEngine**
```typescript
export class AutocompleteEngine {
  async getSuggestions(
    context: AutocompleteContext
  ): Promise<AutocompleteSuggestion[]> {
    // Analyze current context
    // Query schema manager
    // Generate suggestions
    // Apply filters
  }
}
```

### 2. Schema Management System

#### SchemaManager
```typescript
export class SchemaManager {
  private readonly schemaCache: Map<string, ApiSchema>;
  private readonly schemaLoader: SchemaLoader;

  async getSchema(endpoint: string): Promise<ApiSchema> {
    // Check cache
    // Load from Console definitions
    // Parse OpenAPI spec
    // Cache result
  }

  async refreshSchemas(): Promise<void> {
    // Clear cache
    // Reload schemas
    // Update autocomplete engine
  }
}
```

#### SchemaLoader
```typescript
export class SchemaLoader {
  async loadConsoleDefinitions(): Promise<ConsoleApiDefinition[]> {
    // Load from Console plugin
    // Parse definitions
    // Transform to internal format
  }

  async loadOpenApiSpec(): Promise<OpenApiSpec> {
    // Load OpenAPI specification
    // Parse and validate
    // Transform to internal format
  }
}
```

### 3. Autocomplete Integration

#### AutocompleteProvider
```typescript
export class InternalConnectorAutocompleteProvider implements AutocompleteProvider {
  async getSuggestions(
    request: AutocompleteRequest
  ): Promise<AutocompleteSuggestion[]> {
    // Parse current context
    // Determine suggestion type
    // Query appropriate provider
    // Format suggestions
  }
}
```

#### Suggestion Types
```typescript
export enum SuggestionType {
  ENDPOINT = 'endpoint',
  METHOD = 'method',
  PARAMETER = 'parameter',
  VALUE = 'value',
  TEMPLATE = 'template'
}
```

### 4. Request Processing Pipeline

#### Request Pipeline
```typescript
export class RequestPipeline {
  async processRequest(
    request: InternalConnectorRequest
  ): Promise<InternalConnectorResponse> {
    // 1. Validate request structure
    // 2. Apply security policies
    // 3. Transform request
    // 4. Execute HTTP request
    // 5. Parse response
    // 6. Apply response transformations
    // 7. Handle errors
  }
}
```

#### Request Validator
```typescript
export class RequestValidator {
  validateRequest(request: InternalConnectorRequest): ValidationResult {
    // Validate structure
    // Check required fields
    // Validate parameter types
    // Check security constraints
  }
}
```

## Data Models

### Internal Connector Request
```typescript
export interface InternalConnectorRequest {
  id: string;
  type: 'elasticsearch.request';
  request: {
    method: HttpMethod;
    path: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  };
  context?: {
    workflowId: string;
    executionId: string;
    userId: string;
  };
}
```

### Internal Connector Response
```typescript
export interface InternalConnectorResponse {
  id: string;
  status: number;
  headers: Record<string, string>;
  body: any;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
  metadata: {
    executionTime: number;
    timestamp: string;
    requestId: string;
  };
}
```

### Autocomplete Context
```typescript
export interface AutocompleteContext {
  currentPath: string;
  cursorPosition: number;
  currentValue: string;
  parentContext?: any;
  workflowContext?: WorkflowExecutionContext;
}
```

### Autocomplete Suggestion
```typescript
export interface AutocompleteSuggestion {
  type: SuggestionType;
  label: string;
  value: string;
  description?: string;
  documentation?: string;
  category?: string;
  priority: number;
  metadata?: Record<string, any>;
}
```

## Integration Points

### 1. Workflow Execution Engine Integration

#### Step Type Registration
```typescript
// In workflow execution engine
export class InternalConnectorStep implements WorkflowStep {
  async execute(
    context: WorkflowExecutionContext,
    inputs: Record<string, any>
  ): Promise<StepExecutionResult> {
    const requestHandler = context.services.internalConnector.requestHandler;
    const response = await requestHandler.executeRequest(inputs.request, context);
    
    return {
      success: response.status < 400,
      outputs: {
        response: response.body,
        status: response.status,
        headers: response.headers
      },
      error: response.error
    };
  }
}
```

#### Step Factory Integration
```typescript
export class StepFactory {
  createStep(stepDefinition: WorkflowStepDefinition): WorkflowStep {
    switch (stepDefinition.type) {
      case 'elasticsearch.request':
        return new InternalConnectorStep();
      // ... other step types
    }
  }
}
```

### 2. Console Plugin Integration

#### Autocomplete Integration
```typescript
// Extend Console's autocomplete system
export class ConsoleAutocompleteExtension {
  async getSuggestions(
    request: AutocompleteRequest
  ): Promise<AutocompleteSuggestion[]> {
    // Integrate with Console's existing autocomplete
    // Add internal connector specific suggestions
    // Merge with existing suggestions
  }
}
```

#### Schema Sharing
```typescript
// Share API schemas with Console
export class SchemaSharingService {
  async getSharedSchemas(): Promise<ApiSchema[]> {
    // Export schemas for Console
    // Maintain consistency
    // Handle schema updates
  }
}
```

### 3. Security Integration

#### Authentication Integration
```typescript
export class SecurityIntegration {
  async validateRequest(
    request: InternalConnectorRequest,
    user: AuthenticatedUser
  ): Promise<SecurityValidationResult> {
    // Check user permissions
    // Validate API access
    // Apply rate limiting
    // Audit request
  }
}
```

#### Audit Integration
```typescript
export class AuditIntegration {
  async logRequest(
    request: InternalConnectorRequest,
    response: InternalConnectorResponse,
    user: AuthenticatedUser
  ): Promise<void> {
    // Log request details
    // Log response summary
    // Include security context
    // Track performance metrics
  }
}
```

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-4)

#### Week 1-2: Core Infrastructure
- [ ] Create InternalConnectorPlugin structure
- [ ] Implement basic RequestHandler
- [ ] Set up integration with workflow execution engine
- [ ] Create basic request/response models

#### Week 3-4: Basic Functionality
- [ ] Implement basic HTTP request execution
- [ ] Add request validation
- [ ] Integrate with security framework
- [ ] Add basic error handling

### Phase 2: Autocomplete System (Weeks 5-10)

#### Week 5-6: Schema Management
- [ ] Implement SchemaManager
- [ ] Create SchemaLoader for Console definitions
- [ ] Set up schema caching
- [ ] Add schema refresh mechanisms

#### Week 7-8: Autocomplete Engine
- [ ] Implement AutocompleteEngine
- [ ] Create AutocompleteProvider
- [ ] Add basic suggestion generation
- [ ] Integrate with Console autocomplete

#### Week 9-10: Enhanced Suggestions
- [ ] Add context-aware suggestions
- [ ] Implement parameter validation
- [ ] Add documentation integration
- [ ] Optimize suggestion performance

### Phase 3: Advanced Features (Weeks 11-14)

#### Week 11-12: Advanced Request Features
- [ ] Add template variable support
- [ ] Implement bulk operations
- [ ] Add response transformation
- [ ] Implement advanced error handling

#### Week 13-14: Polish & Testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] User acceptance testing
- [ ] Documentation completion

## Performance Considerations

### Caching Strategy
```typescript
export class CacheManager {
  private readonly schemaCache: LRUCache<string, ApiSchema>;
  private readonly suggestionCache: LRUCache<string, AutocompleteSuggestion[]>;

  async getCachedSchema(endpoint: string): Promise<ApiSchema | null> {
    return this.schemaCache.get(endpoint);
  }

  async cacheSuggestions(
    key: string,
    suggestions: AutocompleteSuggestion[]
  ): Promise<void> {
    this.suggestionCache.set(key, suggestions);
  }
}
```

### Request Optimization
- Use connection pooling for HTTP requests
- Implement request batching for bulk operations
- Add response streaming for large datasets
- Optimize JSON parsing and serialization

### Memory Management
- Implement proper cleanup for large responses
- Use streaming for large request bodies
- Implement memory limits and monitoring
- Add garbage collection optimization

## Security Considerations

### Authentication & Authorization
```typescript
export class SecurityManager {
  async validateAccess(
    request: InternalConnectorRequest,
    user: AuthenticatedUser
  ): Promise<AccessValidationResult> {
    // Check user permissions
    // Validate API access rights
    // Apply rate limiting
    // Check resource quotas
  }
}
```

### Input Validation
```typescript
export class InputValidator {
  validateRequestInput(input: any): ValidationResult {
    // Validate request structure
    // Check for injection attacks
    // Validate parameter types
    // Apply size limits
  }
}
```

### Audit Logging
```typescript
export class AuditLogger {
  async logRequest(
    request: InternalConnectorRequest,
    response: InternalConnectorResponse,
    user: AuthenticatedUser
  ): Promise<void> {
    // Log request details
    // Log response summary
    // Include security context
    // Track performance metrics
  }
}
```

## Monitoring & Observability

### Metrics Collection
```typescript
export class MetricsCollector {
  recordRequestMetrics(
    request: InternalConnectorRequest,
    response: InternalConnectorResponse,
    duration: number
  ): void {
    // Record request count
    // Track response times
    // Monitor error rates
    // Track API usage patterns
  }
}
```

### Health Checks
```typescript
export class HealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    // Check schema loading
    // Verify autocomplete functionality
    // Test request execution
    // Monitor resource usage
  }
}
```

## Testing Strategy

### Unit Testing
- Test individual components in isolation
- Mock external dependencies
- Test error scenarios
- Validate security constraints

### Integration Testing
- Test workflow execution integration
- Test Console autocomplete integration
- Test security integration
- Test performance under load

### End-to-End Testing
- Test complete workflow scenarios
- Test autocomplete user experience
- Test error handling and recovery
- Test security and audit features

## Deployment Considerations

### Configuration Management
```typescript
export interface InternalConnectorConfig {
  enabled: boolean;
  maxRequestSize: number;
  timeout: number;
  rateLimit: {
    requestsPerMinute: number;
    burstSize: number;
  };
  cache: {
    schemaTTL: number;
    suggestionTTL: number;
    maxSize: number;
  };
  security: {
    requireAuthentication: boolean;
    auditAllRequests: boolean;
    maxResponseSize: number;
  };
}
```

### Feature Flags
```typescript
export const INTERNAL_CONNECTOR_FEATURE_FLAGS = {
  ENABLE_INTERNAL_CONNECTOR: 'workflows:internalConnector:enabled',
  ENABLE_AUTOCOMPLETE: 'workflows:internalConnector:autocomplete:enabled',
  ENABLE_ADVANCED_FEATURES: 'workflows:internalConnector:advanced:enabled',
} as const;
```

### Migration Strategy
- Gradual rollout with feature flags
- Backward compatibility with existing workflows
- Clear migration path for users
- Comprehensive documentation and training

## Future Enhancements

### 
