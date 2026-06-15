---
name: dev-docs-review
description: Validate placement and content of Kibana developer documentation. Use when creating, moving, or reviewing markdown files in dev_docs/ or docs/extend/, or when a PR touches developer documentation.
---

# Developer Documentation Review

## Documentation Placement

| Content type | Correct location | Notes |
|---|---|---|
| Public (all engineers, internal & external) | `docs/extend/` | Source for the public documentation site |
| Internal-only (Elastic employees) | **Not in this repo** | See https://codex.elastic.dev/r/kibana-team |

### `dev_docs/` is deprecated

`dev_docs/` exists only as a historical redirect from the defunct docs.elastic.dev site. **No new content may be added there.** If you encounter a PR adding files to `dev_docs/`, flag it and direct the author to `docs/extend/` or the internal site.

## Prohibited Content in `docs/extend/`

The following must NOT appear in `docs/extend/` because this directory is published publicly:

| Pattern | Why it's prohibited |
|---|---|
| Links to `docs.elastic.dev` | Defunct internal site; links will 404 for external readers |
| Links to `codex.elastic.dev` | Internal-only site; inaccessible to external readers |
| Links or references to Slack channels | Internal communication channel; not actionable externally |
| Links or references to Google Groups or mailing lists | Internal distribution lists; not actionable externally |

### Acceptable

- Team names (e.g., "the Platform Security team")
- GitHub team mentions (e.g., `@elastic/kibana-core`)

### Detection hints

When reviewing `docs/extend/` content, scan for:

- `docs.elastic.dev`
- `codex.elastic.dev`
- `slack.com`, `#` followed by a channel-like name in context of communication
- `groups.google.com`, `googlegroups`, references to mailing lists

## Review Actions

When flagged content is found:

1. **docs.elastic.dev links** — Replace with the equivalent `docs/extend/` relative path or the public docs URL.
2. **codex.elastic.dev links** — Remove entirely or replace with a generic instruction (e.g., "Consult internal documentation for details").
3. **Slack references** — Replace with a GitHub issue link, discussion link, or remove.
4. **Google Groups / mailing list references** — Replace with a GitHub discussion link or remove.
