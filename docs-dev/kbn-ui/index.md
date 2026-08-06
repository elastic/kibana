---
navigation_title: kbn/ui - Kibana UI
---

# `@kbn/ui` - Kibana UI

Reusable, opinionated UI patterns and components built specifically for Kibana.

## What is Kibana UI?

`@kbn/ui` is Kibana's canonical presentation layer. While [`@elastic/eui`](https://elastic.github.io/eui/) provides Elastic's product-agnostic design language and foundational components, `@kbn/ui` builds on those primitives to solve Kibana-specific UI concerns.

Where EUI gives you flexible building blocks, `@kbn/ui` provides the opinionated glue. It can encapsulate the things EUI intentionally leaves out: state management, URL persistence, data fetching context, application-level layout, etc. By standardizing these patterns, `@kbn/ui` prevents every plugin from re-litigating how to build a standard Kibana user experience.

The packages within `@kbn/ui` generally provide:

- **Opinionated Wrappers:** Thin layers over EUI components that enforce Kibana's visual guidelines by providing standard defaults and restricting props.
- **Composed Patterns:** Higher-order components that wire EUI primitives to Kibana's logic or combine multiple primitives (e.g., standard data tables, search/filter bars).
- **Structure and Layout:** The scaffolding that plugins render inside, such as page templates, application shell grids, and global navigation.
- **Supporting Utilities:** The shared hooks, constants, and tokens that power Kibana's UI layer.

Not every component in `@kbn/ui` is meant for eventual promotion to EUI. Some patterns may graduate upward, but many—- like the application shell or Kibana-specific data contexts—- belong permanently in `@kbn/ui` as the definitive way to build Kibana interfaces.

## Why do we need it?

Kibana has no shared, canonical patterns for common UI flows. The same compositions — search + table, filter bars, empty states, persistent table settings, and more — are often rebuilt independently across plugins, with varying approaches and trade-offs. A recent UI audit surfaced 600+ UX issues stemming from this fragmentation.

EUI major upgrades compound the problem. Every plugin bound directly to EUI primitives absorbs its own share of breaking changes and visual regressions.

`@kbn/ui` is the missing default — a single set of building blocks that encode "the Kibana way."

- **Less code for the same outcome.** Common flows take fewer lines, freeing effort for feature-specific UX.
- **Accessibility baked in.** Focus management, keyboard navigation, and screen reader support are handled at the component level.
- **EUI upgrade insulation.** `@kbn/ui` absorbs EUI breaking changes and exposes a stable contract.
- **One place to evolve.** Global UX tweaks and visual refreshes roll out by updating the layer, not every plugin.

## Portability

Components here are designed to be **portable**. They work in Kibana today, but they can be extracted for use in Cloud UI or promoted up to EUI when a pattern proves valuable across all Elastic products.

To keep that door open, components are fully independent of Kibana. They don't import Kibana core, plugins, or packages that depend on them. Instead, they expose simple, generic interfaces — callbacks, event handlers, context providers — that consumers wire to whatever backing services they need. A component should work in Storybook or Cloud UI with zero Kibana knowledge; the Kibana-specific bridging happens in consuming code, not here.

```tsx
// Good: generic callback the consumer can wire to anything.
onSave: (data: Record<string, unknown>) => Promise<void>

// Bad: leaking a Kibana service type into the component.
savedObjectsClient: SavedObjectsClientContract
```

### Expected dependencies

- `@elastic/eui`
- `@emotion/react`, `@emotion/css`
- `react`, `react-dom`
- `@kbn/i18n`

Additional dependencies _may_ exist, will require review, and should be kept to an absolute minimum.

## Package structure

Each component lives in its own package under `src/platform/kbn-ui/`:

```
src/platform/kbn-ui/
├── <component_name>/
│   ├── kibana.jsonc
│   ├── tsconfig.json
│   ├── package.json
│   ├── index.ts
│   └── src/
└── README.md
```

Packages use the `@kbn/ui-<component>` naming convention and are owned by `@elastic/appex-sharedux`.

## Development [kbn-ui-development]

All `@kbn/ui-*` packages share a single Storybook and docset.

Run the stories in the shared `kbn-ui` Storybook:

```bash
yarn storybook kbn_ui
```

Run a package's tests:

```bash
yarn test:jest src/platform/kbn-ui/<component>
```

Preview these docs from the repository root:

```bash
yarn storybook_docs kbn_ui --dev --docs-path docs-dev
```

Or serve the docset directly:

```bash
docs-builder serve --path docs-dev
```

## Contributing

1. Create a new package directory under `src/platform/kbn-ui/`.
2. Add a `kibana.jsonc` with `"group": "platform"`, `"visibility": "shared"`, and the `@kbn/ui-<name>` id.
3. Export a single public API from `index.ts` — no subpath imports.
4. Include unit tests alongside source files.
5. Respect the dependency and portability rules above.

### Guidelines

- **Compose EUI, don't fork it.** Where EUI provides a primitive, wrap and configure it instead of reimplementing it. Structural components EUI doesn't cover should still build on its theme tokens and breakpoints.
- **Opinionated defaults, escape hatches.** Encode "the Kibana way" by default, but allow overrides where necessary.
- **Mark portability intent.** If a component is a candidate for extraction to Cloud UI or promotion to EUI, note it in the package README.
