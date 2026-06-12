# ES|QL Commands

This directory contains the command system for ES|QL, providing definitions, registry, and utilities for ES|QL commands.

## Key Concepts

### Command Registry
The registry system allows ES|QL commands to be dynamically registered with:
- Validation logic for syntax and semantic checking
- Auto-completion suggestions and context-aware help
- Command-specific behavior and parameter handling

For detailed information about the registry implementation, see the [Registry README](./registry/README.md).

### Command Definitions
Each ES|QL command is defined with:
- Supported parameters and their types
- Validation rules and constraints  
- Auto-completion metadata
- Help text and examples
