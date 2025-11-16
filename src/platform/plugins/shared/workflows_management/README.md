# Workflows Management Plugin

This plugin contains the Workflows management application and APIs.

The workflows management plugin provides the user interface and management capabilities for creating, editing, scheduling, and monitoring workflows. It serves as the primary interface for workflow operations and integrates with the workflows execution engine.

## Enable the feature flag

The workflows management UI is developed behind a UI setting (feature flag). By default, the feature is disabled. To enable it for development or testing, add the following to your `kibana.dev.yml`:

```yml
uiSettings.overrides:
  workflows:ui:enabled: true
```

If running in Serverless or Cloud dev environments, it may be more practical to adjust these via API:

```
POST kbn://internal/kibana/settings
{
   "changes": {
      "workflows:ui:enabled": true,
   }
}
```

## Overview

The workflows management plugin provides:

- **Workflow Designer**: Visual interface for creating and editing workflows
- **Workflow Library**: Browse and manage existing workflows
- **Execution Monitoring**: Track workflow runs and performance
- **Scheduling**: Configure automated workflow execution
- **Connector Integration**: Manage workflow connectors and actions

## Features

### Workflow Creation
- Drag-and-drop workflow designer
- Step configuration and validation
- Variable and context management
- Template support

### Workflow Management
- Workflow versioning and history
- Import/export capabilities
- Workflow sharing and permissions
- Bulk operations

### Execution & Monitoring
- Real-time execution tracking
- Execution history and logs
- Performance metrics
- Error handling and debugging

### Scheduling
- Cron-based scheduling
- Event-driven triggers
- Conditional execution
- Schedule management

## Architecture

The management plugin follows a layered architecture:

- **Public UI**: React-based user interface components
- **Server APIs**: REST endpoints for workflow operations
- **Service Layer**: Business logic and workflow management
- **Scheduler**: Task-based workflow scheduling
- **Connectors**: Integration with external systems

## Key Components

### Workflows Management Service
Core service for workflow CRUD operations and execution management.

### Scheduler Service
Handles scheduled workflow execution using Kibana's task manager.

### Workflows API
RESTful API endpoints for all workflow operations.

### Saved Objects
Workflow definitions stored as Kibana saved objects.

## Dependencies

- **Workflows Execution Engine**: Core execution runtime
- **Task Manager**: For scheduled execution
- **Actions**: For connector support
- **Features**: For feature registration
- **Security**: For access control
- **Triggers Actions UI**: For action configuration
- **Spaces**: For multi-tenancy
- **Embeddable**: For workflow visualization

## API Endpoints

The plugin exposes various API endpoints for workflow management:

### Workflow Management
- `POST /api/workflows/search` - Search and list workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/{id}` - Get workflow
- `PUT /api/workflows/{id}` - Update workflow
- `DELETE /api/workflows/{id}` - Delete workflow
- `POST /api/workflows/{id}/execute` - Execute workflow

### Execution Management
- `GET /api/workflowExecutions` - List workflow executions
- `GET /api/workflowExecutions/{id}` - Get execution details
- `GET /api/workflowExecutions/{id}/logs` - Get execution logs

### Pagination

All paginated endpoints follow a consistent pagination strategy:

**Request Parameters:**
- `page` (number, default: 1) - Page number (1-indexed)
- `size` (number, default: 100) - Number of items per page

**Response Structure:**
```json
{
  "results": [...],
  "page": 1,
  "size": 100,
  "total": 100
}
```

**Examples:**

Search workflows:
```bash
POST /api/workflows/search
{
  "page": 1,
  "size": 100,
  "query": "sales"
}
```

Get workflow executions:
```bash
GET /api/workflowExecutions?workflowId=xxx&page=1&size=100
```

Get execution logs:
```bash
GET /api/workflowExecutions/{id}/logs?page=1&size=100
```

## UI Application

The workflows management UI is available at `/app/workflows` when the feature flag is enabled. It provides:

- Workflow designer interface
- Workflow library and search
- Execution monitoring dashboard
- Schedule management
- Settings and configuration