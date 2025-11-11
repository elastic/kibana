# Workflows Management Plugin

This plugin contains the Workflows management application and APIs.

The workflows management plugin provides the user interface and management capabilities for creating, editing, scheduling, and monitoring workflows. It serves as the primary interface for workflow operations and integrates with the workflows execution engine.

---

## Table of Contents

- [Enable the Feature Flag](#enable-the-feature-flag)
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Dependencies](#dependencies)
- [API Endpoints](#api-endpoints)
- [UI Application](#ui-application)
- [Development](#development)

---

## Enable the Feature Flag

The workflows management UI is developed behind a UI setting (feature flag). By default, the feature is disabled. To enable it for development or testing, add the following to your `kibana.dev.yml`:

```yml
uiSettings.overrides:
  workflows:ui:enabled: true
```

If running in Serverless or Cloud dev environments, it may be more practical to adjust these via API:

```bash
POST kbn://internal/kibana/settings
{
   "changes": {
      "workflows:ui:enabled": true
   }
}
```

---

## Overview

The workflows management plugin provides:

- **Workflow Designer**: Visual interface for creating and editing workflows
- **Workflow Library**: Browse and manage existing workflows
- **Execution Monitoring**: Track workflow runs and performance
- **Scheduling**: Configure automated workflow execution
- **Connector Integration**: Manage workflow connectors and actions

---

## Features

### Workflow Creation
- Drag-and-drop workflow designer
- Step configuration and validation
- Variable and context management
- Template support
- YAML-based workflow definition

### Workflow Management
- Workflow versioning and history
- Import/export capabilities
- Workflow cloning
- Bulk operations

### Execution & Monitoring
- Real-time execution tracking
- Execution history and logs
- Performance metrics
- Error handling and debugging
- Step-level execution details

### Testing & Validation
- Workflow validation before execution
- Test individual steps
- Test complete workflows without saving
- JSON schema validation

---

## Architecture

The management plugin follows a layered architecture:

```
┌─────────────────────────────────────────┐
│          Public UI Layer                │
│  (React components, forms, visualizer)  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Server API Layer                │
│      (REST endpoints, validation)       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│       Service Layer                     │
│  (Business logic, workflow management)  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│    Storage & Execution Layer            │
│ (Saved Objects, Task Manager, Engine)   │
└─────────────────────────────────────────┘
```

### Key Components

- **Workflows Management Service**: Core service for workflow CRUD operations and execution management
- **Workflows API**: RESTful API endpoints for all workflow operations
- **Saved Objects**: Workflow definitions persisted as Kibana saved objects
- **Task Manager Integration**: Handles scheduled workflow execution
- **Connector Integration**: Interfaces with Kibana Actions framework

---

## Dependencies

### Required Plugins

| Plugin | Purpose |
|--------|---------|
| `workflowsExecutionEngine` | Core execution runtime for workflows |
| `taskManager` | Scheduled execution management |
| `actions` | Connector and action support |
| `features` | Feature registration and capabilities |
| `security` | Access control and authentication |
| `triggersActionsUi` | Action configuration UI |
| `spaces` | Multi-tenancy support |
| `navigation` | UI navigation |
| `data`, `dataViews` | Data layer and index patterns |
| `esUiShared` | Shared Elasticsearch UI components |
| `stackConnectors` | Built-in connector types |
| `fieldFormats` | Field formatting utilities |
| `unifiedSearch` | Search capabilities |
| `embeddable` | Workflow visualization |

### Optional Plugins

| Plugin | Purpose |
|--------|---------|
| `alerting` | Integration with alerting framework |
| `serverless` | Serverless-specific features |

---

## API Endpoints

The plugin exposes comprehensive REST API endpoints for workflow management.

### Workflow Management

#### Search Workflows

```http
POST /api/workflows/search
```

**Request Body:**
```json
{
  "limit": 20,
  "page": 1,
  "enabled": true,
  "createdBy": "user@example.com",
  "query": "search term"
}
```

**Response:**
```json
{
  "workflows": [...],
  "total": 42,
  "page": 1,
  "perPage": 20
}
```

---

#### Get Workflow by ID

```http
GET /api/workflows/{id}
```

**Response:**
```json
{
  "id": "workflow-id",
  "name": "My Workflow",
  "description": "Workflow description",
  "enabled": true,
  "definition": {...},
  "yaml": "workflow yaml content",
  "valid": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

#### Create Workflow

```http
POST /api/workflows
```

**Request Body:**
```json
{
  "name": "My New Workflow",
  "description": "Description of the workflow",
  "enabled": true,
  "definition": {...},
  "yaml": "workflow yaml definition"
}
```

**Response:** Returns the created workflow object

---

#### Update Workflow

```http
PUT /api/workflows/{id}
```

**Request Body:** Partial workflow object with fields to update

**Response:** Returns the updated workflow object

---

#### Delete Workflow

```http
DELETE /api/workflows/{id}
```

**Response:** 200 OK on success

---

#### Clone Workflow

```http
POST /api/workflows/{id}/clone
```

**Response:** Returns the newly cloned workflow object

---

#### Bulk Delete Workflows

```http
DELETE /api/workflows
```

**Request Body:**
```json
{
  "ids": ["workflow-id-1", "workflow-id-2"]
}
```

---

### Workflow Execution

#### Run Workflow

```http
POST /api/workflows/{id}/run
```

**Request Body:**
```json
{
  "inputs": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Response:**
```json
{
  "workflowExecutionId": "execution-id"
}
```

---

#### Test Workflow (without saving)

```http
POST /api/workflows/test
```

**Request Body:**
```json
{
  "workflowYaml": "workflow yaml definition",
  "inputs": {
    "param1": "value1"
  }
}
```

**Response:**
```json
{
  "workflowExecutionId": "execution-id"
}
```

---

#### Test Single Step

```http
POST /api/workflows/testStep
```

**Request Body:**
```json
{
  "stepYaml": "step yaml definition",
  "inputs": {...}
}
```

---

### Workflow Execution Monitoring

#### Get Workflow Executions

```http
GET /api/workflowExecutions?workflowId={id}&statuses=running&page=1&perPage=20
```

**Query Parameters:**
- `workflowId` (required): Workflow ID
- `statuses` (optional): Filter by status (pending, running, completed, failed, cancelled)
- `executionTypes` (optional): Filter by execution type
- `page` (optional): Page number (default: 1)
- `perPage` (optional): Results per page (default: 20, max: 100)

**Response:**
```json
{
  "executions": [...],
  "total": 10,
  "page": 1,
  "perPage": 20
}
```

---

#### Get Execution by ID

```http
GET /api/workflowExecutions/{workflowExecutionId}
```

**Response:**
```json
{
  "id": "execution-id",
  "workflowId": "workflow-id",
  "status": "completed",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T00:05:00Z",
  "inputs": {...},
  "outputs": {...}
}
```

---

#### Get Execution Logs

```http
GET /api/workflowExecutions/{workflowExecutionId}/logs?page=1&perPage=50
```

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "level": "info",
      "message": "Step started",
      "stepId": "step-1"
    }
  ],
  "total": 100,
  "page": 1,
  "perPage": 50
}
```

---

#### Get Step Execution Details

```http
GET /api/workflowExecutions/{executionId}/steps/{stepId}
```

**Response:** Detailed information about a specific step execution

---

#### Cancel Workflow Execution

```http
POST /api/workflowExecutions/{workflowExecutionId}/cancel
```

**Response:** 200 OK on success

---

### Workflow Statistics & Analytics

#### Get Workflow Statistics

```http
GET /api/workflows/stats
```

**Response:**
```json
{
  "totalWorkflows": 50,
  "enabledWorkflows": 30,
  "totalExecutions": 1000,
  "successRate": 0.95
}
```

---

#### Get Workflow Aggregations

```http
GET /api/workflows/aggs
```

**Response:** Aggregated workflow data for analytics

---

### Connectors

#### Get Available Connectors

```http
GET /api/workflows/connectors
```

**Response:**
```json
{
  "connectorTypes": [
    {
      "id": ".slack",
      "name": "Slack",
      "enabled": true,
      "count": 5
    }
  ],
  "totalConnectors": 15
}
```

---

### Schema & Validation

#### Get Workflow JSON Schema

```http
GET /api/workflows/workflow-json-schema?loose=false
```

**Query Parameters:**
- `loose` (boolean): Whether to use loose validation

**Response:** JSON Schema for workflow validation

---

## UI Application

The workflows management UI is available at `/app/workflows` when the feature flag is enabled.

### Features

- **Workflow Designer**: Visual workflow builder with drag-and-drop interface
- **Workflow Library**: Browse, search, and filter workflows
- **Execution Dashboard**: Monitor workflow executions in real-time
- **Execution History**: View past executions with filtering and sorting
- **Step-by-step Debugging**: Detailed step execution information
- **Connector Management**: View and configure available connectors

### Routes

- `/app/workflows` - Workflow library (home page)
- `/app/workflows/new` - Create new workflow
- `/app/workflows/edit/{id}` - Edit existing workflow
- `/app/workflows/{id}` - View workflow details
- `/app/workflows/{id}/executions` - View workflow execution history
- `/app/workflows/executions/{executionId}` - View execution details

---

## Development

### Plugin Structure

```
workflows_management/
├── common/              # Shared code (types, schemas, utilities)
├── public/              # Browser-side code
│   ├── application.tsx  # Main application entry
│   ├── components/      # React components
│   ├── features/        # Feature modules
│   ├── pages/          # Page components
│   └── ...
├── server/             # Server-side code
│   ├── workflows_management/  # Core service and API
│   │   ├── routes/           # API route handlers
│   │   └── ...
│   ├── storage/        # Data persistence layer
│   ├── tasks/          # Task manager integration
│   └── ...
└── README.md          # This file
```

### Local Development

1. Enable the feature flag in `kibana.dev.yml`
2. Start Elasticsearch: `yarn es snapshot`
3. Start Kibana: `yarn start`
4. Navigate to `/app/workflows`

### Testing

```bash
# Run unit tests
yarn test:jest src/platform/plugins/shared/workflows_management

# Run integration tests
yarn test:jest_integration src/platform/plugins/shared/workflows_management

# Run FTR tests (if available)
yarn test:ftr --config x-pack/test/workflows_management_api_integration/config.ts
```

### Authentication & Authorization

All API endpoints require authentication. The plugin integrates with Kibana's security framework:

- **Read operations**: Require `read` privilege on workflows
- **Write operations**: Require `write` privilege on workflows
- **Execute operations**: Require `execute` privilege on workflows
- **Delete operations**: Require `delete` privilege on workflows

Workflows are space-aware and respect Kibana Spaces boundaries.

---

## Additional Resources

- [Workflows Execution Engine Plugin](../workflows_execution_engine/README.md)
- [Kibana Plugin Development Guide](https://www.elastic.co/guide/en/kibana/current/development.html)

---

**Plugin Owner**: `@elastic/workflows-eng`