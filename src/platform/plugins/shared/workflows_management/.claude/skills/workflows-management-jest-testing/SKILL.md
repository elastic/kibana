---
name: workflows-management-jest-testing
description: Use the shared TestProvider in workflows_management Jest tests instead of hand-wiring KibanaContextProvider, QueryClientProvider, WorkflowsContextProvider, MemoryRouter, I18nProvider, and the Redux Provider. Use when writing or updating React/Jest tests under src/platform/plugins/shared/workflows_management/public/**, rendering components or hooks that touch Kibana services, the Redux store, react-query, routing, or i18n.
---

# workflows_management Jest Testing

The `workflows_management` plugin ships a single shared test provider that wires up every context a component or hook in this plugin typically needs. Use it instead of composing providers by hand.

## When to Use

Use `TestProvider` / `getTestProvider` for any Jest test under `src/platform/plugins/shared/workflows_management/public/**` that:

- renders a component or hook that reads from the Redux store,
- calls `useKibana()` / `useStartServices()` or otherwise consumes Kibana plugin services,
- uses `@kbn/react-query` (`useQuery`, `useMutation`, …),
- relies on `react-router-dom` (`useHistory`, `useParams`, links, …),
- uses `i18n` formatted messages,
- consumes `WorkflowsContext`.

If your test only exercises a pure function with no React tree, you don't need the provider.

## Import

```ts
import {
  TestProvider,
  getTestProvider,
} from '../../../shared/mocks/test_providers';
```

The path is `public/shared/mocks/test_providers.tsx`. Adjust the relative depth to match the test file's location.

## API

`TestProvider` accepts three optional props, all of which are auto-created with sensible defaults if omitted:

- `store` — Redux store from `createMockStore()` (`public/entities/workflows/store/__mocks__/store.mock`). Pass an explicit one when the test needs to dispatch actions or inspect state.
- `queryClient` — a `QueryClient` instance. Pass an explicit one when the test needs to seed cache, disable retries, etc.
- `services` — `StartServicesMock` from `public/mocks.ts` (`createStartServicesMock()`). Pass an explicit one (typically a partial override on top of `createStartServicesMock()`) when the test needs custom service behavior.

`getTestProvider(params)` returns a `wrapper` component for use with `@testing-library/react` `render` / `renderHook` when the test needs to share a specific store / `QueryClient` / services instance with the rendered tree (e.g. to dispatch actions, inspect state, or seed cache).

When the test does **not** need to reference any provider value directly, pass `TestProvider` as the wrapper instead — it builds its own defaults internally.

## Patterns

### Render with default providers (no custom values needed)

```tsx
import { render } from '@testing-library/react';
import { TestProvider } from '../../../shared/mocks/test_providers';

it('renders the editor', () => {
  render(<MyComponent />, { wrapper: TestProvider });
});
```

### Render with a shared store the test inspects

Use `getTestProvider({ ... })` when the test needs to share a specific provider value (most often the Redux store) with the rendered tree to dispatch actions or assert state.

```tsx
import { render } from '@testing-library/react';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';

it('updates the store on change', () => {
  const store = createMockStore();
  render(<MyComponent />, { wrapper: getTestProvider({ store }) });

  // ...interact with the component...

  expect(store.getState().detail.yamlString).toBe('...');
});
```

### Render a hook

```tsx
import { renderHook } from '@testing-library/react';
import { TestProvider } from '../../../shared/mocks/test_providers';

it('returns workflow details', () => {
  const { result } = renderHook(() => useWorkflowDetails(), {
    wrapper: TestProvider,
  });
});
```

### Override services for a specific test

```tsx
import { createStartServicesMock } from '../../../mocks';
import { TestProvider } from '../../../shared/mocks/test_providers';

const services = createStartServicesMock();
services.notifications.toasts.addError = jest.fn();

render(
  <TestProvider services={services}>
    <MyComponent />
  </TestProvider>
);
```

## Anti-patterns

Do not hand-wire any of these inside a test file when `TestProvider` already provides them:

- `KibanaContextProvider` from `@kbn/kibana-react-plugin/public`
- `QueryClientProvider` from `@kbn/react-query`
- `WorkflowsContextProvider`
- `MemoryRouter`
- `I18nProviderMock`
- Redux `Provider`

If a test needs a non-default behavior, override it through the `store` / `queryClient` / `services` props instead of replacing the wrapper.

If a missing context is needed in many tests, add it to `TestProvider` rather than duplicating wrappers per test file.

## Related

- `public/mocks.ts` — `createStartServicesMock`, `createUseKibanaMockValue`, `workflowsManagementMocks`. Use these for service-level overrides and for typing `useKibana` mocks.
- `public/entities/workflows/store/__mocks__/store.mock.ts` — `createMockStore` for store-level overrides.
- For mocks from other Kibana plugins (e.g. `kqlPluginMock`, `fieldFormatsServiceMock`, `dataPluginMock`, `coreMock`), prefer the plugin's published `*/public/mocks` entrypoint over rolling your own.
