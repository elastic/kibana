# @kbn/a2ui-renderer

A renderer for [A2UI](https://a2ui.org) v1.0 documents — the open protocol for describing a user
interface as declarative JSON rather than generated code.

An A2UI document names components from a **catalog** and binds their properties to a **data model**.
It cannot contain markup or script, so there is nothing to sanitise: an agent can only reference
components that have been pre-approved in the catalog.

This package implements the protocol. It contains no components of its own — pair it with a catalog
such as `@kbn/a2ui-eui-catalog`.

## Usage

```tsx
const processor = new MessageProcessor();
processor.applyAll(messages);

<A2uiSurface
  surface={processor.getSurface('panel-1')!}
  catalog={euiCatalog}
  onAction={(event) => {
    // event.name / event.context, with bindings already resolved
  }}
/>;
```

## What is implemented

The four document-shaped message types — `createSurface`, `updateComponents`, `updateDataModel`,
`deleteSurface` — plus:

- **Data binding** via RFC 6901 JSON Pointers (`{ "path": "/form/name" }`).
- **Function calls** (`{ "call": "formatDate", "args": {...} }`) resolved against the catalog.
- **Dynamic list templates** (`children: { componentId, path }`), where relative paths resolve
  against the current item and `{ "call": "@index" }` yields its position.
- **Two-way binding** — input components write straight back to the bound path.
- **Actions** — `action.event` is resolved and handed to the host via `onAction`.
- **Progressive rendering** — a reference to a component that has not been defined yet renders
  nothing instead of throwing.

## What is not

`callRendererFunction` / `agentFunctionResponse` (the live agent round-trip), `checks` validation,
multi-catalog mixing, and capability negotiation. These are not needed to render a stored document.

## Vendored schemas

`schemas/v1_0/` is copied verbatim from
[`@a2ui/web_core`](https://github.com/a2ui-project/a2ui) (Apache License 2.0) and is the normative
contract this package implements. Do not hand-edit — re-copy from upstream when moving protocol
versions.
