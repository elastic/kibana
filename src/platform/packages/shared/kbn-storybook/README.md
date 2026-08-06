# Kibana Storybook

This package provides ability to add [Storybook](https://storybook.js.org/) to any Kibana package or plugin.

- [Kibana Storybook](#kibana-storybook)
  - [Setup Instructions](#setup-instructions)
    - [Customizing configuration](#customizing-configuration)
  - [Writing Stories](#writing-stories)
  - [Running Storybook](#running-storybook)
  - [Embeddable Stories](#embeddable-stories)
  - [Inline Docs Assets](#inline-docs-assets)
    - [Output](#output)
    - [Development Mode (`--dev`)](#development-mode---dev)
    - [Docs-Builder Integration](#docs-builder-integration)

## Setup Instructions

Add a `.storybook/main.js` configuration file to your plugin. For example, create a file at `src/plugins/<plugin>/.storybook/main.js`, with the following contents:

```js
module.exports = require('@kbn/storybook').defaultConfig;
```

Add a reference to `@kbn/storybook` to the `kbn_references` of the package's `tsconfig.json`.

Add your plugin alias to the [`src/dev/storybook/aliases.ts` configuration file](/src/dev/storybook/aliases.ts).

### Customizing configuration

The `defaultConfig` object provided by the `@kbn/storybook` package should be all you need to get running, but you can
override this in your `.storybook/main.js`. Using [Storybook's configuration options](https://storybook.js.org/docs/configure).

You can also add a `manager.ts` file to customize various aspects of your Storybook. For example, to change the title and link of the Storybook sidebar, you could add:

```ts
addons.setConfig({
  theme: create({
    brandTitle: 'My Plugin',
    brandUrl: 'https://github.com/elastic/kibana/tree/main/src/plugins/my_plugin',
  }),
});
```

Refer to the [Storybook documentation](https://storybook.js.org/docs/configure/user-interface/features-and-behavior) for more information.

## Writing Stories

Create sample Storybook stories. For example, in your plugin create a file at `src/plugins/<plugin>/public/components/hello_world/hello_world.stories.tsx` with the following [Component Story Format](https://storybook.js.org/docs/api/csf) contents:

```jsx
import type { Meta, StoryObj } from '@storybook/react';

import { MyComponent } from './MyComponent';

const meta = {
  component: MyComponent,
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Basic: Story = {};

export const WithProp: Story = {
  args: {
    prop: "value"
  }
};
```

## Running Storybook

Launch Storybook with `yarn storybook <plugin>`, or build a static site with `yarn storybook --site <plugin>`.

## Embeddable Stories

Tag stories that are safe to consume outside Storybook with `embeddable`. Use the `EmbeddableStoryObj` type (imported as a type, so no runtime code is pulled into the story bundle) to require the tag and strongly type `parameters.embeddable`:

```tsx
import type { EmbeddableStoryObj } from '@kbn/storybook';

export const Basic: EmbeddableStoryObj<StoryArgs> = {
  tags: ['embeddable'],
  parameters: { embeddable: { height: 96 } },
};
```

`parameters.embeddable.height` is an optional initial-height hint (in pixels) that reserves space and reduces layout shift before the embed measures itself. Sizing is otherwise derived at runtime: the inline embed observes the rendered container and the iframe fallback `postMessage`s its height, both reported via the `kbn-storybook-docs:resize` event (`EMBEDDABLE_RESIZE_EVENT`) for the host to auto-size the embed.


## Inline Docs

Build inline docs assets from embeddable stories for external documentation systems, (e.g. `docs-builder`):

```sh
yarn storybook_docs <plugin> --dist   # registry + inline assets + tarball
yarn storybook_docs <plugin> --build  # registry + inline assets, no tarball
yarn storybook_docs <plugin> --dev    # serve with CORS, watch sources, start docs-builder
```

### Output

All modes write to a dedicated `built_assets/storybook-docs/` tree, kept separate from the Storybook static site under `built_assets/storybook/`. This includes `built_assets/storybook-docs/docs_registry.json` and a per-alias directory `built_assets/storybook-docs/<alias>/` containing the manifest and inline registry bundle.

`--dist` additionally writes a `built_assets/storybook-docs-<alias>-<sha>.tar.gz` archive with `sha256` integrity.

Only `embeddable` stories are included by default. Use `--include-all-stories` to include untagged stories for local debugging.

### Development Mode (`--dev`)

`--dev` serves `built_assets` at `http://127.0.0.1:6007` with CORS so the registry and iframe fallback resolve locally. It also prints the `docs-builder` `storybook.registry` snippet, watches the alias's story sources, and rebuilds the inline registry bundle on change. Note that `docs-builder` only live-reloads on markdown changes, so you must refresh the docs page to see story-code edits.

To keep the loop fast, `--dev` reuses an existing static Storybook build (`built_assets/storybook/<alias>/`) instead of rebuilding it every run. It builds automatically on the first run or whenever that output is missing.

**Important:** Because the reused build is a snapshot, **adding or removing stories, or changing shared deps, needs a rebuild**. Pass `--rebuild-storybook` to force a rebuild. Alternatively, use `--skip-storybook-build` to always reuse and never rebuild (even when the output is missing).

### Docs-Builder Integration

When `--dev` finds a `docset.yml` colocated with the alias and `docs-builder` is on your `PATH`, it automatically launches `docs-builder serve` for that docset. It points `KIBANA_STORYBOOK_REGISTRY` at your local registry so embeds render live against your local assets.

Kibana's internal developer docs live in `docs-dev/` rather than beside the packages they document, so auto-detection finds nothing for aliases such as `kbn_ui`. Pass the docset explicitly:

```bash
yarn storybook_docs kbn_ui --dev --docs-path docs-dev
```

Options for docs-builder integration:
- `--docs-path <dir>`: Point at a docset auto-detection won't find, or a different one.
- `--docs-port <port>`: Override docs-builder's default port.
- `--no-docs`: Skip launching docs-builder entirely.

If `docs-builder` isn't installed, the asset server still runs and prints the registry snippet so you can wire it up manually.


