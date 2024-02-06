# Dynamic Component Loader

The `dynamic` utility function is designed to simplify the lazy loading of React components, providing a convenient way to dynamically load components and handle suspense during the loading process. This utility is especially useful for optimizing the initial loading time of your application by loading components only when they are needed.

## Usage

The `dynamic` function takes a `Loader` callback and optional `DynamicOptions` as parameters. It returns a React component wrapped in a `Suspense` component, allowing you to lazily load and render the specified component.
To ensure a component can still make use of a passed `ref`, the `React.forwardRef` utility is used to wrap the newly created component.

### Basic Usage

```tsx
import { dynamic } from '@kbn/shared-ux-utility';

const MyLazyComponent = dynamic(() => import('./MyLazyComponent'));

// Usage in JSX
<MyLazyComponent />
```

### With Fallback

You can provide a fallback UI element to be displayed while the component is being loaded. This is particularly helpful for providing a loading indicator.

```tsx
import { dynamic } from '@kbn/shared-ux-utility';
import { LoadingSpinner } from './LoadingSpinner';

const MyLazyComponentWithFallback = dynamic(() => import('./MyLazyComponent'), {
  fallback: <LoadingSpinner />,
});

// Usage in JSX
<MyLazyComponentWithFallback />
```

### Named Exports

If you have named exports in your dynamically loaded module, you can extract them returning an object with the `.default` property.

```tsx
import { dynamic } from '@kbn/shared-ux-utility';

const LazyMobileHeader = dynamic(() => import('./components/header').then(mod => ({ default: mod.MobileHeader })));

// Usage in JSX
<LazyMobileHeader />
```

## API Reference

### dynamic<TElement extends React.ComponentType<any>, TRef = {}>(loader: Loader<TElement>, options?: DynamicOptions): React.ComponentType<TProps>

- `loader`: A function that returns a `Promise` resolving to an object with a `default` property, which is the component to be lazily loaded.
- `options`: Optional configuration object with the following property:
  - `fallback`: UI element to be displayed while the component is being loaded.
