---
name: kibana-dev-packages
description: List Kibana packages/plugins, list GitHub teams, and generate new packages. Use when asked about packages, plugins, teams, or when scaffolding a new package.
---

# Kibana Dev Packages

## Overview

Kibana is organized into modules (packages and plugins), each defined by a `kibana.jsonc` file. This skill covers listing them, finding their owning teams, and generating new ones.

## Helper scripts

All scripts are run from the repo root. They use `@kbn/setup-node-env` to enable TypeScript execution.

### List packages and plugins

```bash
node --no-experimental-require-module -r @kbn/setup-node-env .agents/skills/kibana-dev-packages/list_packages.ts
```

Options:
- `--team <team>` -- filter by owning GitHub team (e.g., `@elastic/kibana-core`)
- `--exclude-plugins` -- show only packages, exclude plugins

Output: JSON with `packages` and `plugins` arrays, each item containing `name`, `directory`, `description`, `owner`.

### List GitHub teams

```bash
node --no-experimental-require-module -r @kbn/setup-node-env .agents/skills/kibana-dev-packages/list_teams.ts
```

Output: JSON with a `teams` array of all unique GitHub team names from package manifests.

## Generate a new package

Use the built-in generator script directly (no helper needed). Required parameters:

- `name`: Must start with `@kbn/` (e.g., `@kbn/my-new-package`)
- `--owner`: The owning GitHub team (use `list_teams.ts` above to find valid values)
- `--group`: One of `platform`, `observability`, `security`, `search`, `workplaceai`

```bash
node scripts/generate.js package @kbn/<package-name> \
  --owner @elastic/<team-name> \
  --group <group> \
  --visibility shared \
  --license x-pack
```

After generating, run `yarn kbn bootstrap` to wire up the new package.
