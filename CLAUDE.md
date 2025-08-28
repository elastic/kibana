# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## GitHub MCP Setup

This project has GitHub MCP server configured for enhanced GitHub integration. If not already connected, set it up with:

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp -H "Authorization: Bearer YOUR_GITHUB_TOKEN"
```

Verify connection with:
```bash
claude mcp list
claude mcp get github
```

## Development Workflow

### Git Repository Setup
This is a fork-based development workflow:
- **`origin`**: `https://github.com/elastic/kibana.git` (upstream Elastic repository)
- **`shaharfork`**: `https://github.com/shahargl/kibana.git` (development fork)

### Standard Workflow
1. Work on feature branches locally
2. Push feature branches to `shaharfork` (your fork)
3. Create PRs from your fork to `elastic/kibana`
4. Track issues and main project work on `elastic/kibana`

Check current setup: `git remote -v`

## Development Commands

### Core Development Commands
- `yarn start` - Start Kibana in development mode
- `yarn start --serverless` - Start in serverless mode
- `yarn build` - Build production artifacts
- `yarn es` - Start Elasticsearch for local development

### Testing Commands
- `yarn test:jest` - Run Jest unit tests
- `yarn test:jest_integration` - Run Jest integration tests
- `yarn test:ftr` - Run functional tests (FTR - Functional Test Runner)
- `yarn test:type_check` - Run TypeScript type checking

### Code Quality Commands
- `yarn lint` - Run all linting (ESLint + Stylelint)
- `yarn lint:es` - Run ESLint only
- `yarn lint:style` - Run Stylelint only
- `yarn quick-checks` - Run quick validation checks before commits

### Utility Commands
- `yarn kbn` - Access to Kibana CLI utilities
- `yarn storybook` - Start Storybook for UI component development
- `yarn checkLicenses` - Validate license compliance

## Architecture Overview

### Codebase Structure
Kibana follows a modular, plugin-based architecture with clear separation between core platform and extensions:

- **`/src/`** - Core Kibana platform and open-source plugins
  - `/src/core/` - Core platform services (HTTP, saved objects, security, etc.)
  - `/src/platform/plugins/` - Platform plugins (shared and private)
  - `/src/dev/` - Development tools and utilities
- **`/x-pack/`** - Commercial features and premium plugins
  - `/x-pack/platform/plugins/` - Commercial platform plugins
  - `/x-pack/solutions/` - Domain-specific solutions (observability, security, search, chat)
- **`/packages/`** - 100+ utility packages with `@kbn/` namespace
- **`/examples/`** - Developer example plugins and demonstrations

### Key Architectural Concepts

1. **Plugin System**: Everything extends through plugins. Each plugin has a `kibana.jsonc` manifest defining dependencies and capabilities.

2. **Core Platform**: Provides foundational services that plugins consume:
   - HTTP server and routing
   - Saved objects persistence layer
   - Security and authentication
   - Configuration management
   - Dependency injection system

3. **Package Architecture**: Shared functionality organized in packages:
   - `@kbn/core-*` - Core platform components
   - `@kbn/dev-*` - Development tools
   - `@kbn/ui-*` - UI components and utilities
   - `@kbn/es-*` - Elasticsearch integration utilities

4. **Testing Strategy**: Multi-layered approach with Jest unit tests, integration tests, and FTR functional tests. Each package/plugin typically has its own test configuration.

### Development Patterns

- **TypeScript First**: Strict typing with project references via `tsconfig.json` files
- **Monorepo**: Yarn workspaces with dependency validation
- **Plugin Lifecycle**: Plugins have setup/start phases with dependency injection
- **API Contracts**: Well-defined interfaces between core and plugins
- **Modular Testing**: Each component has isolated test configurations

---

## Workflows Engine Team - Specific Guidance

### Architecture & Codebase Focus

**Primary Workflows Engine Components:**
- **`/src/platform/plugins/shared/workflows_management/`** - Workflow management UI and APIs (owned by @elastic/workflows-eng)
- **`/src/platform/plugins/shared/workflows_execution_engine/`** - Stateless execution engine (owned by @elastic/workflows-eng)  
- **`/src/platform/packages/shared/kbn-workflows/`** - Shared workflow types and utilities
- **`/examples/workflows/`** - Example workflow plugin for developers

### Core Development Principles

1. **Keep Things Simple**: Avoid unnecessary complexity
2. **Don't Reinvent the Wheel**: Leverage existing Kibana patterns and utilities
3. **Strict Code Boundaries**: Only modify files within the workflows engine scope unless explicitly required
4. **Repository Pattern**: Use consistent data access patterns
5. **Service Layer Architecture**: Clear separation between UI, API, and business logic
6. **Stateless Execution**: Engine should be stateless and scalable
7. **⚠️ CRITICAL: Execution Engine Independence**: The `workflows_execution_engine` MUST remain stateless and independent of Kibana core services. It should not depend on Kibana's HTTP services, routing, or internal APIs directly. This ensures the engine can run in background tasks, external workers, or other execution contexts without Kibana runtime dependencies.

### Workflows Engine Architecture

**Management Plugin (`workflows_management/`):**
- **Public UI**: React-based workflow designer, library, and monitoring
- **Server APIs**: REST endpoints for workflow CRUD operations  
- **Service Layer**: Business logic for workflow management
- **Scheduler**: Task-based workflow scheduling via Kibana task manager
- **Connectors**: Integration layer with external systems

**Execution Engine (`workflows_execution_engine/`):**
- **Step Factory**: Creates and manages different workflow step types
- **Context Manager**: Runtime context and variable management
- **Event Logger**: Comprehensive execution logging to Elasticsearch
- **Repositories**: Data persistence for executions and state
- **Task Manager Integration**: Scheduled workflow execution

### Key Technologies & Patterns

**Core Technologies:**
- TypeScript with strict typing
- Kibana Plugin Architecture  
- Elasticsearch for data storage
- YAML workflow definitions
- Zod for schema validation
- React for UI components

**Architectural Patterns:**
- Repository Pattern for data access
- Factory Pattern for step creation
- Service Layer for business logic
- Plugin Architecture following Kibana conventions
- Event-driven execution logging

### Development Workflow

1. **Type Definition**: Start with comprehensive TypeScript interfaces
2. **Schema Validation**: Use Zod for runtime validation
3. **Repository Layer**: Implement data access patterns
4. **Service Layer**: Build business logic with proper error handling
5. **API Layer**: Expose REST endpoints with OpenAPI specs
6. **UI Components**: Build React components with proper testing
7. **Integration Testing**: Comprehensive test coverage including FTR tests

### Testing Standards

- **Jest** as primary testing framework
- **High test coverage** requirements (aim for >80%)
- **Type safety** validation in tests  
- **Integration testing** for workflows end-to-end
- **Repository pattern testing** with proper mocks
- **API endpoint testing** with request/response validation

### Code Style & Standards

**TypeScript Best Practices:**
- Strict typing with comprehensive interfaces
- Discriminated unions for step types
- Proper error handling with typed exceptions
- Kibana naming conventions (camelCase, PascalCase for components)

**File Organization:**
```
workflows_management/
├── common/           # Shared types and utilities
├── public/           # React UI components and client logic
│   ├── entities/     # Data models and API hooks  
│   ├── features/     # Feature-specific UI components
│   └── widgets/      # Reusable UI widgets
└── server/           # Server-side APIs and services
    ├── connectors/   # Connector integrations
    ├── workflows_management/  # Core workflow APIs
    └── scheduler/    # Task scheduling service
```

### Feature Flag Configuration

Workflows features are behind feature flags. Enable for development:

```yml
# kibana.dev.yml
uiSettings.overrides:
  workflows:ui:enabled: true
```

### Key API Endpoints

- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow  
- `GET /api/workflows/{id}` - Get workflow
- `PUT /api/workflows/{id}` - Update workflow
- `POST /api/workflows/{id}/execute` - Execute workflow
- `GET /api/workflows/{id}/executions` - Get execution history

### Important Files & Patterns

- **`kibana.jsonc`** - Plugin manifests with dependencies and ownership
- **Workflow Schemas** - Zod schemas in `/common/schema.ts` files
- **Repository Classes** - Data access patterns in `/repositories/` directories
- **Step Implementations** - Step execution logic in `/step/` directories  
- **API Route Handlers** - HTTP endpoint implementations following Kibana patterns

This architecture enables the workflows team to build scalable, maintainable workflow management and execution capabilities while following Kibana's established patterns and maintaining clear code ownership boundaries.

---

## Current Work Status

### Epic #13173: Internal Elastic Action Steps

**Progress Summary:**
- ✅ Created ElasticsearchSpecsLoader to read 568+ API specifications from console plugin
- ✅ Added server routes `/api/workflows/connectors/elasticsearch` and `/api/workflows/connectors/all`
- ✅ Implemented dynamic schema generation with full ES API coverage
- ❌ Dynamic Monaco editor integration failed - rolled back to static schemas
- 🔄 **Current Issue**: Monaco editor validation only shows hardcoded types instead of all ES APIs

**Technical Implementation:**
- **Specs Source**: `/src/platform/plugins/shared/console/server/lib/spec_definitions/json/generated/` (568 files)
- **Server Integration**: `ElasticsearchSpecsLoader` class converts ES specs to `ConnectorContract[]`
- **Schema Generation**: Full Zod schema with individual literal types for each API
- **Monaco Issue**: Attempted dynamic schema loading but TypeScript/React integration failed

**Files Modified:**
- `src/platform/plugins/shared/workflows_management/server/lib/elasticsearch_specs_loader.ts` - ES specs parser
- `src/platform/plugins/shared/workflows_management/server/routes/api/connectors_specs.ts` - API endpoints
- `src/platform/plugins/shared/workflows_management/common/dynamic_schema.ts` - Frontend schema loading
- `src/platform/packages/shared/kbn-workflows/spec/lib/generate_yaml_schema.ts` - Schema generation logic

**Next Steps:**
1. **Alternative Approach**: Instead of dynamic loading, generate static schemas at build time from ES specs
2. **Sugar Syntax**: Implement transformation rules for user-friendly workflow syntax
3. **Kibana APIs**: Load specs from `oas_docs/output/kibana.yaml` for internal Kibana actions
4. **API Key Context**: Investigate user context issue showing 'elastic' instead of actual user

**Known Issues:**
- Dynamic schema approach doesn't work with Monaco editor React integration
- TypeScript configuration prevents proper validation of dynamic schemas
- Need build-time static generation instead of runtime dynamic loading