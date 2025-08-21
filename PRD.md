# Product Requirements Document: Internal Connector for Workflows

## Overview

### Background
The workflows system currently supports external connectors for various services, but lacks the ability to interact with Kibana's internal APIs and Elasticsearch directly. This limitation prevents workflows from leveraging the full power of the Elastic stack for data manipulation, monitoring, and automation tasks.

### Problem Statement
Security teams and other users need to create workflows that can:
- Query and manipulate Elasticsearch data directly
- Interact with Kibana's internal APIs
- Perform complex data operations without external dependencies
- Leverage existing Kibana authentication and authorization

### Solution
Implement an "Internal Connector" that provides direct access to Kibana/Elasticsearch APIs through the workflows system, similar to how Kibana's Console (Dev Tools) works, but integrated into the workflow execution engine.

## Goals & Objectives

### Primary Goals
1. **Universal API Access**: Support every Kibana/Elasticsearch API endpoint
2. **Dynamic Autocomplete**: Provide intelligent autocomplete for API parameters
3. **Seamless Integration**: Work within existing workflow architecture
4. **Security Compliance**: Maintain existing authentication and authorization

## User Stories

### Epic 1: Basic Internal Connector Support
**As a** workflow developer  
**I want to** use an internal connector to make Elasticsearch API calls  
**So that** I can query and manipulate data directly in my workflows

**Acceptance Criteria:**
- [ ] Internal connector type `elasticsearch.request` is available
- [ ] Support for GET, POST, PUT, DELETE HTTP methods
- [ ] Support for custom request paths and bodies
- [ ] Proper error handling and response parsing
- [ ] Integration with workflow execution engine

### Epic 2: Dynamic Autocomplete System
**As a** workflow developer  
**I want to** receive intelligent autocomplete suggestions for API parameters  
**So that** I can quickly and accurately build API requests

**Acceptance Criteria:**
- [ ] Autocomplete for API endpoints (e.g., `/_search`, `/index/_doc`)
- [ ] Autocomplete for request body parameters
- [ ] Context-aware suggestions based on selected endpoint
- [ ] Real-time suggestions as user types
- [ ] Support for nested JSON structures

### Epic 3: Advanced API Features
**As a** workflow developer  
**I want to** use advanced Elasticsearch features in my workflows  
**So that** I can perform complex data operations

**Acceptance Criteria:**
- [ ] Support for query DSL autocomplete
- [ ] Support for aggregations and pipelines
- [ ] Support for script parameters
- [ ] Support for template variables in requests
- [ ] Support for bulk operations

## Technical Requirements

### Functional Requirements

#### FR1: API Request Support
- Support all HTTP methods (GET, POST, PUT, DELETE, HEAD, OPTIONS)
- Support custom request headers
- Support request body with JSON/YAML
- Support query parameters
- Support path parameters

#### FR2: Response Handling
- Parse JSON responses
- Extract specific fields from responses
- Handle pagination automatically
- Support response streaming for large datasets
- Provide error details for failed requests

#### FR3: Authentication & Authorization
- Use existing Kibana authentication
- Respect user permissions and roles
- Support API key authentication
- Support service account authentication
- Audit all API calls

#### FR4: Autocomplete System
- Dynamic endpoint discovery
- Parameter suggestion based on API schema
- Context-aware suggestions
- Real-time validation
- Support for complex nested structures

### Non-Functional Requirements

#### NFR1: Performance
- API request latency < 100ms for simple requests
- Autocomplete response time < 500ms
- Support for concurrent workflow executions
- Efficient memory usage for large responses

#### NFR2: Security
- No new security vulnerabilities
- Proper input validation and sanitization
- Rate limiting for API calls
- Audit logging for all operations

## User Experience Requirements

### Workflow Definition
```yaml
steps:
  - name: searchDocs
    type: 'elasticsearch.request'
    request:
      method: GET
      path: /workflows_e2e/_search
      body:
        size: 5
        sort:
          - created_at: desc
        query:
          term:
            category: news
```

### Autocomplete Experience
- **Endpoint Suggestions**: As user types `/`, show available endpoints
- **Method Suggestions**: Auto-suggest appropriate HTTP methods
- **Parameter Suggestions**: Show required and optional parameters
- **Value Suggestions**: Suggest valid values for parameters
- **Documentation**: Show inline help and examples

## Integration Points

### Workflow Execution Engine
- Integrate with existing step execution framework
- Support for step retry and error handling
- Integration with workflow context and variables
- Support for conditional execution based on responses

### Console Integration
- Leverage existing Console autocomplete infrastructure
- Reuse API schema definitions
- Share authentication mechanisms
- Maintain consistency with Console UX

### Security Framework
- Integrate with Kibana's security plugin
- Support for role-based access control
- Audit logging integration
- Rate limiting integration

## Constraints & Limitations

### Technical Constraints
- Must work within existing workflow architecture
- Cannot break existing connector functionality
- Must maintain backward compatibility
- Limited to Kibana's supported APIs

### Security Constraints
- Must respect existing authentication mechanisms
- Cannot bypass security policies
- Must audit all operations
- Must support least privilege principle

## Success Criteria

### Phase 1: Basic Implementation
- [ ] Internal connector supports basic Elasticsearch operations
- [ ] Autocomplete works for simple API calls
- [ ] Integration with workflow execution engine
- [ ] Basic error handling and logging

### Phase 2: Enhanced Autocomplete
- [ ] Dynamic endpoint discovery
- [ ] Context-aware parameter suggestions
- [ ] Real-time validation
- [ ] Support for complex query DSL

### Phase 3: Advanced Features
- [ ] Support for all Kibana APIs
- [ ] Advanced query building tools
- [ ] Template variable support
- [ ] Bulk operation support

## Dependencies

### Internal Dependencies
- Workflow execution engine
- Console plugin (for autocomplete infrastructure)
- Security plugin (for authentication)
- HTTP service (for API calls)

### External Dependencies
- Elasticsearch API documentation
- OpenAPI specifications
- Schema validation libraries

## Future Considerations

### Potential Enhancements
- Visual query builder interface
- Query template library
- Advanced debugging tools
- Performance monitoring dashboard
- API usage analytics

### Long-term Vision
- Integration with other Elastic products
- Support for custom API endpoints
- Advanced workflow orchestration
- Machine learning-powered suggestions
