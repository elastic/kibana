# Workflows Plugin Skeleton

This directory contains the foundational structure for the Workflows plugin.

## Main Folders

- **[common](./common/)/**: Code shared between client and server (types, constants, utilities).
  - [workflows/models](./common/workflows/models): common DTO types
- **public/**: Client-side code (UI, React components, hooks, services, utilities).
- **server/**: Server-side code (API routes, capabilities, settings, server logic).
  - [api](./server/api/): workflow management api (CRUD)

Each folder is organized to separate concerns and facilitate scalable plugin development.

## Configuration ##
By default, the plugin is disabled.
To make the plugin work for you, in your kibana.dev.yml add these keys:
```yml
workflowsManagement.enabled: true
workflowsExecutionEngine.enabled: true
```