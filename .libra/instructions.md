# Kibana review guidance

- When reviewing authorization and data isolation, treat Kibana Spaces isolation and Saved Objects security as explicit security boundaries.
- When a PR adds or changes a public HTTP API (`access: 'public'` routes, their schemas, or OpenAPI YAML under `docs/openapi`, `common/api`, or `*.schema.yaml`), read and apply `.agents/skills/api-docs-review/SKILL.md` to those files.
