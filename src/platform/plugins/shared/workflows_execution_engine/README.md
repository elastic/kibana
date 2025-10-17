# Workflows Execution Engine Plugin

Stateless execution engine for workflows.

The workflows execution engine is responsible for executing workflow definitions and managing their lifecycle. It provides the core runtime for workflow processing, step execution, and state management.

## Overview

The workflows execution engine plugin provides:

- **Workflow Execution**: Core runtime for executing workflow definitions
- **Step Management**: Individual step execution and state tracking
- **Context Management**: Runtime context and variable management
- **Event Logging**: Comprehensive execution logging and monitoring
- **Repository Layer**: Persistence for executions and state

## Architecture

The execution engine follows a modular architecture:

- **Plugin Core**: Main plugin setup and lifecycle management
- **Step Factory**: Creates and manages different step types
- **Context Manager**: Handles workflow and step execution context
- **Event Logger**: Logs workflow execution events and state changes
- **Repositories**: Data persistence layer for executions and logs

## Key Components

### Step Execution
The engine supports various step types and provides a factory pattern for step creation and execution.

### Context Management
Workflow context is managed throughout execution, allowing steps to access and modify shared state.

### Event Logging
All workflow execution events are logged to Elasticsearch for monitoring and debugging.

## Dependencies

- **Task Manager**: For scheduled workflow execution
- **Actions**: For connector-based step execution (*this is temporary*)

## Usage

The execution engine is primarily used by the workflows management plugin to execute workflow definitions. It provides APIs for:

- Starting workflow executions
- Managing execution state
- Retrieving execution logs and status
- Handling step-by-step execution flow
