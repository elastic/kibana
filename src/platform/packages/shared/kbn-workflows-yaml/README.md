# @kbn/workflows-yaml

Shared utilities for parsing, validating, and serializing Kibana workflow definitions written in YAML.

The package provides:

- **YAML parsing** — convert workflow YAML to JSON (with or without schema validation), extract document errors, and stringify definitions back to YAML with a stable key order.
- **Liquid templating** — a cached Liquid engine plus helpers to validate templates and pinpoint error positions inside expressions.
- **Regex helpers** — shared patterns and predicates for variables, property paths, and Liquid blocks/tags used by the editor and runtime.
- **Zod helpers** — type inference, human-readable type descriptions, and error formatting/enrichment for connector and workflow schemas.
- **Typed errors** — `InvalidYamlSchemaError`, `InvalidYamlSyntaxError`, `WorkflowValidationError`, and `WorkflowConflictError` with type guards.
