# @kbn/react-fiber

Helpers for reading React Fiber nodes from DOM elements and resolving which component (and which line of source) rendered them. Intended for development tooling only: the `_debug*` fiber properties they rely on do not exist in production builds.

## Basic helpers

Thin wrappers around the fiber data structure.

- `getFiberFromElement(node)` – the fiber React attached to a DOM node.
- `getFiberName(fiber)` – tag name for host elements, component name otherwise (unwraps `memo` / `forwardRef`).
- `getOwnerChain(fiber)` – the fiber followed by the fibers that rendered it, closest first. Falls back to the tree parent when an element was created outside of a render.
- `getDebugSource(fiber)` – `{ fileName, lineNumber, columnNumber }` of the JSX that created the fiber, `null` for compiled dependencies. The only place that knows how React stores that location, see [React 19](#react-19).
- `getFiberRoot(fiber)` – the root (`createRoot` or `ReactDOM.render`) a fiber was rendered into, with the DOM node it renders to as `containerInfo`. Portalled content belongs to the root of the component that rendered it.
- `isHostFiber`, `isComponentFiber`, `isLegacyRoot`, `isEuiComponentName`, `isIgnoredComponentName`, `isSourceComponent` – predicates used to classify fibers, roots and component names.

## Composed helpers

Built on top of the basic ones; these answer the questions developer tools usually ask.

- `isRenderedWithin(element, container)` – whether React rendered an element within a container's subtree, including content portalled elsewhere in the DOM such as modals and popovers.
- `findFiberWithDebugSource(element)` – the closest fiber with source information for a DOM element, together with that information and the element that owns the fiber. Searches the element's own owner chain first, then its DOM ancestors.
- `findSourceComponentName(fiber)` – the closest application component (not a host element, EUI component or wrapper) responsible for a fiber.
- `findEuiComponentName(fiber, isCandidate?)` – the closest EUI component responsible for a fiber, optionally filtered.
- `getComponentStack(fiber)` – `{ name, source }` frames from the fiber up to the application root, pairing every source location with the application component that rendered it (EUI components and other wrappers running render props are skipped). Unnamed components, e.g. `memo(() => …)`, and JSX created outside of a render are reported as `Anonymous`.

```ts
import {
  findFiberWithDebugSource,
  findSourceComponentName,
  getComponentStack,
} from '@kbn/react-fiber';

const target = findFiberWithDebugSource(element);
if (target) {
  findSourceComponentName(target.fiber); // 'SaveButton'
  target.source; // { fileName, lineNumber, columnNumber }
  getComponentStack(target.fiber); // [{ name: 'SaveButton', source }, { name: 'Panel', source }, ...]
}
```

## React 19

`getDebugSource` reads `_debugSource`, which React 19 no longer sets ([facebook/react#28265](https://github.com/facebook/react/pull/28265)). The other fiber properties used here are unchanged, so names and owner chains keep working after the upgrade, but no fiber has a location: `findFiberWithDebugSource` returns `null` and `getComponentStack` is empty.

Two ways to get locations back, both inside `getDebugSource`:

- Symbolicate `_debugStack` (React 19.1+), the `Error` React captures when an element is created. Its frames point into the bundles, so this needs source maps back to the original files (the optimizer's `cheap-source-map` only maps to transformed code) and makes lookups async.
- Keep Babel's `__source`: point `importSource` at a dev-only wrapper of `react/jsx-dev-runtime` that stores the `source` argument per props object in a `WeakMap`, then look it up via `fiber.memoizedProps`. Sync and as precise as today, but needs the automatic JSX runtime in `@kbn/babel-preset` (and `sourceSelf: true` on Babel 8).

To be decided with the React 19 migration, [#256181](https://github.com/elastic/kibana/issues/256181).
