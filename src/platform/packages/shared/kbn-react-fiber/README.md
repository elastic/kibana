# @kbn/react-fiber

Helpers for reading React Fiber nodes from DOM elements and resolving which component (and which line of source) rendered them. Intended for development tooling only: the `_debugSource` and `_debugOwner` fiber properties are attached by `@babel/preset-react` in development mode and do not exist in production builds.

## Basic helpers

Thin wrappers around the fiber data structure.

- `getFiberFromElement(node)` – the fiber React attached to a DOM node.
- `getFiberName(fiber)` – tag name for host elements, component name otherwise (unwraps `memo` / `forwardRef`).
- `getOwnerChain(fiber)` – the fiber followed by the fibers that rendered it, closest first. Falls back to the tree parent when an element was created outside of a render.
- `isHostFiber`, `isComponentFiber`, `hasDebugSource`, `isEuiComponentName`, `isIgnoredComponentName`, `isSourceComponent` – predicates used to classify fibers and component names.

## Composed helpers

Built on top of the basic ones; these answer the questions developer tools usually ask.

- `isRenderedWithin(element, container)` – whether React rendered an element within a container's subtree, including content portalled elsewhere in the DOM such as modals and popovers.
- `findFiberWithDebugSource(element)` – the closest fiber with source information for a DOM element, together with the element that owns that fiber. Searches the element's own owner chain first, then its DOM ancestors.
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
  target.fiber._debugSource; // { fileName, lineNumber, columnNumber }
  getComponentStack(target.fiber); // [{ name: 'SaveButton', source }, { name: 'Panel', source }, ...]
}
```

Note that React 19 removes `_debugSource` in favour of `_debugStack`; the composed helpers are the place to adapt when Kibana upgrades.
