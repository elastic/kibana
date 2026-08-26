# @kbn/dependency-quarantine

Freeze current usage of selected dependencies. Existing files (or glob-covered trees) can keep importing them; new files outside the allowlist cannot.

## Config

Add one JSON file per quarantined package under `configs/`:

```json
{
  "name": "@langchain/aws",
  "reason": "Use @kbn/langchain wrappers instead of importing @langchain/aws directly.",
  "allowed": ["x-pack/platform/packages/shared/kbn-langchain/**"]
}
```

`name` matches that specifier and subpaths. Empty `allowed` means fully banned. Expanding usage is a PR to the config, reviewed by `@elastic/kibana-security`.

## Enforcement

ESLint rule `@kbn/imports/no_quarantined_imports` (`eslint-disable` comments do not apply).
