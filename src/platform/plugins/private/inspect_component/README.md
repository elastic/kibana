# @kbn/inspect-component-plugin

Dev-only Kibana adapter for the inspect and grab tools of [`@kbn/ui-developer-toolbar`](../../../kbn-ui/developer-toolbar). The overlay, flyout and keyboard shortcuts (`⌘ '` / `⌘ ⇧ '` on Mac, `Ctrl '` / `Ctrl Shift '` elsewhere) live in the package; this plugin only supplies the Kibana-specific host.

## What it does

- On start, registers two `InspectButton`s from `@kbn/ui-developer-toolbar` as items of the developer toolbar (optional `developerToolbar` plugin dependency): `Inspect Component` (`mode="inspect"`) and `Grab Component` (`mode="grab"`, copies on click or `⌘ C` / `Ctrl C`, or drags, an agent-friendly description of the element and its pruned component stack). Kibana chrome (`kbnChromeLayout*` classes) is ignored by the overlay.
- `public/lib/create_inspect_host.ts` builds the `InspectHostConfig`:
  - `resolveFileData` calls `POST /internal/inspect_component/inspect`, which returns the codeowners and repo-relative path of the inspected file. Grab mode also uses it once to derive the repository root that shortens the paths in the copied context.
  - `getSourceLinks` uses `createGithubSourceLinks` for `elastic/kibana` on the running Kibana branch.
  - `getCodeownerHref` links `@elastic/*` codeowners to their GitHub team page.

## Configuration

- Only runs in development mode (`devOnly` plugin; the browser side also checks `env.mode.dev`).
- `inspect_component.enabled` (default `true` in development; only `false` is accepted outside development). Set it to `false` in `kibana.dev.yml` to disable the tool.

See [`docs-dev/kbn-ui/developer-toolbar.md`](../../../../../docs-dev/kbn-ui/developer-toolbar.md) for the package documentation.
