---
name: build-prototype-from-a-design
description: "Builds a working Kibana prototype from a design screenshot or description. Use when asked to 'build this design', 'prototype this', 'implement this UI', 'add this panel', or 'replace this component' in Kibana. Produces real EUI-based code in the examples/ directory. Never intended to be merged — optimised for speed and visual fidelity over production readiness."
---

# build-prototype-from-a-design

Turns a design into working Kibana code. Uses EUI components throughout, targets pixel-perfect fidelity, and outputs to `examples/<plugin_name>/` so it gets picked up by the dev toolchain without polluting the main codebase.

Always start in **Plan mode** before writing any code. The plan step is not optional — it's where ambiguity gets resolved cheaply.

---

## Inputs

The user will provide one or more of:
- A **screenshot** of the design pasted into the chat
- A **description** of what to build or change
- A **pointer to an existing plugin** to build upon or modify

If the request is ambiguous (e.g. "build this" with no context), ask one focused question to resolve it before planning.

---

## Phase 1: Plan

Read the design carefully. Produce a short, structured plan covering:

**1. Scope**
State clearly what this is:
- New plugin (full page, new entry in nav)
- New page within an existing plugin
- New component or panel added to an existing page
- Replacement of an existing component

**2. Location**
- For new plugins: `examples/<plugin_name>/`
- For additions/modifications: identify the specific file(s) to change

**3. Layout breakdown**
Walk through the design top to bottom, naming the EUI components that map to each visible element. Be specific — `EuiPageTemplate`, `EuiPanel`, `EuiFlexGroup`, not just "a panel" or "a grid". If a design element has no direct EUI equivalent, call that out explicitly and propose the closest alternative.

**4. Data shape**
Identify what data the UI needs. For a prototype, all data is hardcoded — define the shape of the mock data (field names, types, example values) so it's consistent across components.

**5. Interactions**
List any interactions visible in the design (drawer opens on click, filters update the view, tabs switch content). Note which will be implemented and which will be stubbed.

**6. Files to create or modify**
List every file that will be created or changed, with a one-line description of what each contains.

---

Use this template to structure the plan — fill in every section before presenting it:

```markdown
## Plan: <Plugin Display Name>

### Scope
<!-- one of: new plugin / new page in existing plugin / new component / modification -->

### Location
`examples/<plugin_name>/`

### Layout breakdown
| Design element | EUI component |
|---|---|
| ... | ... |

### Data shape
<!-- Define the mock data types that will live in mock_data.ts -->
```ts
interface <EntityName> {
  id: string;
  // ...
}

const <entities>: <EntityName>[] = [ ... ];
```

### Interactions
- [ ] <interaction> — implemented
- [ ] <interaction> — stubbed (no-op)

### Files
| File | Purpose |
|---|---|
| `kibana.jsonc` | Plugin manifest |
| `tsconfig.json` | TS config |
| `public/index.ts` | Plugin entry point |
| `public/plugin.ts` | App registration |
| `public/application.tsx` | React mount |
| `public/mock_data.ts` | Hardcoded data |
| `public/components/app.tsx` | Page shell |
| ... | ... |

### Out of scope
<!-- Anything visible in the design that won't be built, and why -->
```

Present the completed plan to the user and wait for approval before writing any code. If the user wants to adjust scope, update the plan first.

---

## Phase 2: Build

Once the plan is approved, build in this order:

### For a new plugin

> **Do not use `node scripts/generate_plugin`.** The script produces an outdated `kibana.json` format that the current toolchain ignores entirely. Create all files manually.

**1. Create the plugin directory in `examples/`**

Use `examples/<plugin_name>/` — not `plugins/<plugin_name>/`. The `/plugins/` root directory is gitignored, so `git ls-files` can't see it and bootstrap will never register it with the rspack optimizer.

**2. Create `kibana.jsonc`** — the manifest must use this exact format:

```jsonc
{
  "type": "plugin",
  "id": "@kbn/<plugin_name>-plugin",
  "owner": "@elastic/kibana-<plugin_name>",
  "description": "<one line description>",
  "group": "platform",
  "visibility": "private",
  "plugin": {
    "id": "<camelCasePluginId>",
    "server": false,
    "browser": true,
    "requiredPlugins": []
  }
}
```

Key differences from the old format: `id` at top level is a package ID (`@kbn/...`), plugin-specific fields are nested under `"plugin"`, use `"browser"` not `"ui"`, `"owner"` is a string not an object.

**3. Create `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./target/types"
  },
  "include": [
    "public/**/*.ts",
    "public/**/*.tsx",
    "../../typings/**/*"
  ]
}
```

**4. Create `public/index.ts`**

```ts
import { DataFabricPlugin } from './plugin';

export function plugin() {
  return new DataFabricPlugin();
}
```

**5. Create `public/plugin.ts`**

```ts
import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

export class <PluginName>Plugin implements Plugin {
  public setup(core: CoreSetup): void {
    core.application.register({
      id: '<camelCasePluginId>',
      title: '<Display Name>',
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart, params);
      },
    });
  }
  public start(_core: CoreStart): void {}
  public stop() {}
}
```

**6. Create `public/application.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { App } from './components/app';

export const renderApp = (
  _coreStart: CoreStart,
  _depsStart: unknown,
  { element }: AppMountParameters
) => {
  ReactDOM.render(<App />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};
```

**7. Bootstrap and verify**

Do **not** run bootstrap yourself — the sandbox blocks the required Node version and credential access. Instead, ask the user to run it in their terminal:

> Please run `yarn kbn bootstrap` in your terminal to register the new plugin.

Once they confirm it completed, you can check that the plugin is registered:

```bash
grep "<plugin_name>" node_modules/@kbn/repo-packages/package-map.json
```

If it's missing, bootstrap didn't find the `kibana.jsonc`. Check:
- The file is at `examples/<plugin_name>/kibana.jsonc` (not `plugins/`)
- The `id` field at the top level of the manifest is set correctly

**8. Build components top-down**

Start with the page shell, then work inward: layout → panels → individual components → data. Never leave a component referencing something that doesn't exist yet — stub it inline first, then replace.

### For additions or modifications to an existing plugin

Identify the target file from the plan. Make the smallest change that achieves the design goal — don't refactor surrounding code.

---

### EUI usage rules

- **Always use EUI.** No custom CSS, no inline styles, no third-party component libraries.
- Match the design's visual weight, spacing, and typography using EUI tokens — don't eyeball it with arbitrary values.
- Use `useEuiTheme()` for colours — never hardcode hex values. Valid token examples: `euiTheme.colors.backgroundBasePlain`, `euiTheme.colors.borderBasePlain`, `euiTheme.colors.subduedText`, `euiTheme.colors.primary`.
- **Never render `EuiProvider` inside a plugin.** Kibana's core already provides it — a second provider causes conflicts.
- For icons, use `EuiIcon` with the appropriate `type` from the EUI icon set. If an exact match doesn't exist, use the closest semantic equivalent.
- Status indicators (Good/Degraded/Poor) → `EuiHealth` with `color="success"`, `color="warning"`, `color="danger"`.
- Data metrics and stats → `EuiStat`.
- Code blocks → `EuiCodeBlock`.
- Flyout / detail drawer → `EuiFlyout` / `EuiFlyoutBody` / `EuiFlyoutHeader`.
- Filter sidebars → `EuiFilterGroup`, `EuiCheckboxGroup`, or `EuiFacetGroup` depending on the design.
- Flow/graph diagrams → there is no native EUI graph component; use a lightweight layout with `EuiFlexGroup` and SVG connector lines, or note to the user that a graph library would be needed for production.

---

### Mock data

All data is hardcoded. Define it in a single `mock_data.ts` file at the component level and import from there — never scatter literals across components. Match the data to what's visible in the design exactly (same labels, same values, same counts).

---

### What to skip

This is a prototype. Do not implement:
- i18n (`i18n.translate`) — use plain strings
- Unit or functional tests
- API integrations or data fetching
- Accessibility audits
- Error states (unless shown in the design)
- Loading states (unless shown in the design)
- TypeScript strictness — types are welcome but don't let them slow things down

---

## Phase 3: Preview check

### Step 1 — Check for `kibana.dev.yml` (ALWAYS run this first, no exceptions)

**This step is mandatory regardless of whether the user reports Kibana is running or not. Never skip it.**

Read `config/kibana.dev.yml`. This file controls the local dev environment and is needed to determine the base path for the preview URL.

**If the file does not exist**, offer to create it with this baseline and ask the user to confirm before writing:

```yaml
# Developer tooling
inspect_component.enabled: true
developer_toolbar.enabled: true

# Feature flags useful for prototype work
feature_flags.overrides:
  core.theme.mixedMode.enabled: true

# Enable solution views (Observability / Security / Search nav) on the Spaces UI
xpack.spaces.allowSolutionVisibility: true

# Set the default landing route after login (change to /app/security or /app/elasticsearch as needed)
uiSettings.overrides:
  defaultRoute: /app/observability

# Fake cloud context — enables cloud-gated features locally
xpack.cloud.id: "fake_cloud_id:24h124h11249u31r4"
xpack.cloud.base_url: "https://cloud.elastic.co"

# Elastic-managed LLM (no API key needed for Elastic employees)
xpack.actions.preconfigured:
  elastic-llm:
    name: Elastic LLM
    actionTypeId: .inference
    exposeConfig: true
    config:
      provider: 'elastic'
      taskType: 'chat_completion'
      inferenceId: '.rainbow-sprinkles-elastic'
      providerConfig:
        model_id: 'rainbow-sprinkles'
```

> **Note on solution views:** `xpack.spaces.allowSolutionVisibility: true` enables the solution picker in the Spaces UI, but the solution nav (curated sidebar) must still be set once manually: **Stack Management → Spaces → default → Edit space → Solution**. Valid values are Observability, Security, and Search. This is a one-time step per Elasticsearch snapshot — it's stored in the saved objects index, not config.

**If the file exists**, read it and extract `server.basePath` if set. Use that value as `<basepath>` in the preview URL. If `server.basePath` is not set, the base path is randomly generated on each restart — look it up from the browser's current URL instead.

---

### Step 2 — Check if Kibana is running

```bash
curl -s http://localhost:5601/api/status 2>/dev/null | python3 -c "import sys,json; s=json.load(sys.stdin); print('running' if s.get('status',{}).get('overall',{}).get('level') else 'not running')"
```

**If not running:**
> Done. To preview the prototype, run these two commands in separate terminal tabs:
>
> ```bash
> yarn es snapshot --license trial
> ```
> ```bash
> yarn start --run-examples
> ```
>
> **Important:** Plugins in `examples/` are not loaded by default — the `--run-examples` flag is required or the app will return "Application not found". The `--license trial` flag enables all features locally.
>
> Let me know when Kibana finishes starting up and I'll open the browser to validate the prototype.

When the user reports Kibana is ready, re-run the status check to confirm it's live, then **go back and complete Step 1** (check / create `kibana.dev.yml`) before proceeding to the browser validation steps below. Never skip Step 1, even when the user triggers the preview check by reporting Kibana is up.

**If running:**

Open the built-in browser, navigate to the app, and verify it loaded — don't just hand the user a URL.

1. Use `browser_navigate` to go to `http://localhost:5601/<basepath>/app/<camelCasePluginId>`
2. Check `browser_console_messages` for errors
3. If errors are found, fix them immediately and re-check — do not surface console errors to the user and ask them to investigate

Common errors to watch for:
- `X is not defined` — a component is used but not imported; add it to the import list
- `JSON MIME type` / bundle load error — an unused TypeScript declaration is causing a compile failure; remove it
- `Cannot read properties of undefined` — mock data shape doesn't match what a component expects; fix the mock

Once the console is clean, share the direct URL with the user.

---

## Notes for the agent

- **Stay in the design.** Don't add features, states, or components not visible in the screenshot. If something is ambiguous, pick the simpler interpretation and note it in the plan.
- **Name things after the design.** Plugin name, component names, and mock data field names should reflect the design's language, not generic placeholders.
- **One component per file.** Keep components focused and easy to navigate.
- **Hardcode liberally.** A prototype that renders correctly with fake data is more valuable than one that fetches real data and breaks.
- **Avoid unused declarations.** TypeScript strict mode is active — unused interfaces, variables, and imports will cause the bundle to fail with a JSON MIME type error in the browser. Every declared symbol must be used.
- **For EUI reference**, look at existing usage in `x-pack/solutions/`, `x-pack/platform/plugins/`, and `src/platform/plugins/` — these are the best sources for real patterns.
