# Cursor AI Agent Configuration for Kibana Workflow Development

## Overview
I'm a Kibana developer working on the one-workflow team, focusing on building workflow management and execution capabilities for Kibana. My work involves developing a comprehensive workflow system that includes YAML-based workflow definitions, execution engines, management APIs, and Elasticsearch integration.


** KEEP THINGS SIMPLE **
** DO NOT INVENT THE WHEEL IF NOT NEEDED **

## My Development Context

### Architecture Patterns
- **Repository Pattern**: For data access layer (see `WorkflowExecutionRepository`)
- **Service Layer**: Business logic separation (see `WorkflowsService`)
- **API Layer**: REST endpoint management (see `WorkflowsManagementApi`)
- **Plugin Architecture**: Kibana plugin lifecycle management
- **Factory Pattern**: For step creation and execution
- **Stateless Execution Engine**: The workflow execution engine must be completely stateless - all dependencies (Kibana APIs, user context, security services, etc.) must be encoded/decoded by the calling layer (testWorkflow, executeWorkflow, task scheduler) so the execution engine can work seamlessly without direct access to Kibana services

### Core Technologies & Patterns
- **TypeScript/JavaScript**: Primary development language
- **Kibana Plugin Architecture**: Working within Kibana's plugin system
- **Elasticsearch**: Data persistence and indexing for workflows and executions
- **YAML**: Workflow definition format with schema validation
- **Zod**: Schema validation and type safety
- **REST APIs**: Building management and execution APIs

### Key Areas of Focus
1. **Workflow Management**: CRUD operations, workflow definitions, scheduling
2. **Workflow Execution Engine**: Runtime execution, step processing, state management
3. **Workflow Specifications**: YAML schemas, validation, type definitions
4. **Execution Monitoring**: Logging, execution history, debugging tools
5. **Integration**: Connectors, triggers, Elasticsearch integration

## Code Style & Patterns

### TypeScript Best Practices
- Use strict typing with comprehensive interfaces
- Prefer type exports from `@kbn/workflows` package
- Follow Kibana's naming conventions (camelCase for variables, PascalCase for classes)
- Use discriminated unions for complex type hierarchies
- Implement proper error handling with typed errors

### Architecture Patterns
- **Repository Pattern**: For data access layer (see `WorkflowExecutionRepository`)
- **Service Layer**: Business logic separation (see `WorkflowsService`)
- **API Layer**: REST endpoint management (see `WorkflowsManagementApi`)
- **Plugin Architecture**: Kibana plugin lifecycle management
- **Factory Pattern**: For step creation and execution
- **Stateless Execution Engine**: The workflow execution engine must be completely stateless - all dependencies (Kibana APIs, user context, security services, etc.) must be encoded/decoded by the calling layer (testWorkflow, executeWorkflow, task scheduler) so the execution engine can work seamlessly without direct access to Kibana services

### File Organization
```
src/platform/
├── packages/shared/kbn-workflows/          # Shared types and utilities
│   ├── types/                             # TypeScript type definitions
│   ├── spec/                              # Schema definitions
│   └── common/                            # Constants and utilities
├── plugins/shared/workflows_management/    # Management plugin
│   ├── server/
│   │   ├── workflows_management/          # Core management logic
│   │   ├── scheduler/                     # Scheduling service
│   │   └── connectors/                    # Connector integrations
└── plugins/shared/workflows_execution_engine/  # Execution engine
    ├── server/
    │   ├── repositories/                  # Data access layer
    │   ├── step/                          # Step execution logic
    │   └── context/                       # Execution context management
```

## Common Development Tasks

### 1. Workflow Definition Development
- **YAML Schema Updates**: Modify workflow specification schemas
- **Type Definitions**: Add new workflow types and interfaces
- **Validation Logic**: Implement Zod-based validation
- **Schema Generation**: Generate YAML schemas for IDE support

### 2. Execution Engine Development
- **Step Implementation**: Create new step types and execution logic
- **Context Management**: Handle workflow execution state
- **Error Handling**: Implement retry policies and failure handling
- **Performance Optimization**: Optimize execution performance

### 3. API Development
- **REST Endpoints**: Build management and execution APIs
- **Request/Response Types**: Define DTOs and command types
- **Error Handling**: Implement proper HTTP error responses
- **Validation**: Request validation and sanitization

### 4. Data Layer Development
- **Elasticsearch Integration**: Index management and queries
- **Repository Pattern**: Data access layer implementation
- **Migration Scripts**: Schema updates and data migrations
- **Performance**: Query optimization and indexing strategies

## Code Examples & Patterns

### Workflow Type Definition
```typescript
import type { WorkflowDefinition, WorkflowStepDefinition } from '@kbn/workflows';

interface CustomWorkflowStep extends WorkflowStepDefinition {
  type: 'custom.step.type';
  with: {
    // Step-specific configuration
  };
}
```

### Repository Pattern
```typescript
export class WorkflowExecutionRepository {
  constructor(private esClient: ElasticsearchClient) {}

  public async getWorkflowExecutionById(
    workflowExecutionId: string
  ): Promise<EsWorkflowExecution | null> {
    // Implementation with proper error handling
  }
}
```

### API Layer Pattern
```typescript
export class WorkflowsManagementApi {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private schedulerService: SchedulerService | null = null
  ) {}

  public async createWorkflow(
    workflow: CreateWorkflowCommand,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    // Implementation with proper validation and error handling
  }
}
```

### Schema Validation
```typescript
import { z } from '@kbn/zod';

export const WorkflowStepSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  with: z.record(z.string(), z.any()).optional(),
});
```

## Testing Preferences

### Unit Testing
- **Jest**: Primary testing framework
- **Type Safety**: Ensure tests maintain type safety
- **Mocking**: Mock Elasticsearch client and external dependencies
- **Coverage**: Aim for high test coverage on business logic

### Integration Testing
- **API Testing**: Test REST endpoints with proper request/response validation
- **Elasticsearch Testing**: Use test indices and proper cleanup
- **Workflow Execution Testing**: End-to-end workflow execution tests

## Debugging & Development Tools

### Development Environment
- **Kibana Dev Mode**: Use `yarn start` for development
- **Elasticsearch**: Local ES instance for development
- **Kibana Dev Tools**: For Elasticsearch queries and debugging
- **Chrome DevTools**: For frontend debugging

### Logging & Monitoring
- **Execution Logs**: Comprehensive logging for workflow executions
- **Performance Metrics**: Monitor execution performance
- **Error Tracking**: Proper error logging and stack traces

## Common Challenges & Solutions

### 1. Type Safety Across Plugins
- **Solution**: Use shared types from `@kbn/workflows` package
- **Pattern**: Export types from shared package, import in plugins

### 2. Elasticsearch Schema Evolution
- **Solution**: Implement proper migration strategies
- **Pattern**: Version schemas and provide migration scripts

### 3. Workflow Execution State Management
- **Solution**: Use context managers and state machines
- **Pattern**: Immutable state updates with proper event logging

### 4. Performance Optimization
- **Solution**: Optimize Elasticsearch queries and indexing
- **Pattern**: Use bulk operations and proper index mappings

## Code Review Guidelines

### What I Look For
- **Type Safety**: Proper TypeScript usage and type definitions
- **Error Handling**: Comprehensive error handling and logging
- **Performance**: Efficient queries and resource usage
- **Testability**: Code that's easy to test and mock
- **Documentation**: Clear comments and documentation

### Common Issues to Avoid
- **Type Assertions**: Prefer proper typing over type assertions
- **Hardcoded Values**: Use constants and configuration
- **Sync Operations**: Prefer async/await patterns
- **Memory Leaks**: Proper cleanup in long-running operations

## Resources & References

### Key Files to Reference
- `src/platform/packages/shared/kbn-workflows/types/latest.ts` - Core type definitions
- `src/platform/packages/shared/kbn-workflows/spec/schema.ts` - Workflow schemas
- `src/platform/plugins/shared/workflows_management/server/workflows_management/workflows_management_api.ts` - Management API
- `src/platform/plugins/shared/workflows_execution_engine/server/repositories/workflow_execution_repository.ts` - Data layer

### Documentation
- Kibana Plugin Development Guide
- Elasticsearch Client Documentation
- Zod Schema Validation Documentation
- Workflow YAML Specification

## Communication Style

### When Asking for Help
- Provide context about the specific workflow feature I'm working on
- Include relevant code snippets and error messages
- Mention the specific plugin or component involved
- Reference existing patterns in the codebase

### When Providing Solutions
- Focus on Kibana-specific patterns and conventions
- Consider the workflow execution context
- Ensure solutions work with the existing plugin architecture
- Provide examples that follow established patterns

## Development Workflow

### Feature Development Process
1. **Type Definition**: Start with TypeScript interfaces
2. **Schema Validation**: Implement Zod schemas for validation
3. **Repository Layer**: Implement data access logic
4. **Service Layer**: Add business logic
5. **API Layer**: Expose REST endpoints
6. **Testing**: Write comprehensive tests
7. **Documentation**: Update README and API docs

### Code Review Process
1. **Self-Review**: Check for type safety and error handling
2. **Peer Review**: Focus on architecture and patterns
3. **Integration Testing**: Ensure compatibility with existing features
4. **Performance Review**: Check for optimization opportunities

This configuration should help Cursor provide more targeted and relevant assistance for my workflow development work in Kibana.
```

This `agents.md` file is specifically tailored to your role as a Kibana developer working on workflow management and execution. It captures the key patterns, technologies, and development practices I observed in your codebase, including:

1. **Architecture patterns** from your workflow management and execution engine
2. **Type safety practices** using the `@kbn/workflows` package
3. **Repository and service layer patterns** from your existing code
4. **YAML schema validation** with Zod
5. **Elasticsearch integration** patterns
6. **Plugin architecture** considerations

The file provides Cursor with context about your specific domain, common development tasks, preferred patterns, and the overall architecture you're working with. This should help Cursor provide more relevant and targeted assistance when you're working on workflow-related features.
