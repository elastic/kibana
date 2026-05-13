# Components

Shared presentational components and consumer-side hooks that don't manage
global provider state. They live in `kbn-content-list-provider` because they
depend on provider context (`useContentListConfig`, `useContentListState`), but
are architecturally distinct from `features/` — which manages shared state via
the reducer.

If more components accumulate here, this directory is a candidate for extraction
into a dedicated `kbn-content-list-components` package.

## Current residents

| Directory | Contents |
|-----------|----------|
| `delete/` | `DeleteConfirmationComponent` — stateless presentational modal driven entirely by props. `DeleteConfirmationModal` — connected wrapper that reads config from context and manages its own loading/error state. `useDeleteConfirmation` — hook that encapsulates modal open/close state for consumers. |
