# @kbn/developer-toolbar

A development toolbar for Kibana with real-time performance monitoring and custom debugging tools.

## Features

- **Frame Jank Monitor**: Tracks slow one-second frame samples against a 60+ FPS session target, long tasks, and slow-interaction p75 (not standard INP)
- **Memory Usage**: Displays estimated JavaScript heap usage and possible heap growth, not proven leaks
- **Console Errors**: Captures and displays console errors and warnings in real-time
- **Environment Info**: Shows current environment and build information
- **Custom Items**: Add your own toolbar items declaratively

## Setup

The toolbar meant to be rendered once by chrome

```tsx
import { DeveloperToolbar } from '@kbn/developer-toolbar';

function App() {
  return (
    <>
      <MyApp />
      <DeveloperToolbar envInfo={{ version: '1.0.0' }} />
    </>
  );
}
```

## Adding Custom Items

Register custom toolbar items anywhere in your component tree:

```tsx
import { DeveloperToolbarItem } from '@kbn/developer-toolbar';
import { EuiButtonIcon } from '@elastic/eui';

function MyComponent() {
  return (
    <>
      <h1>My Feature</h1>
      <DeveloperToolbarItem id="my-debug-tool" priority={10}>
        <EuiButtonIcon iconType="inspect" onClick={handleDebug} />
      </DeveloperToolbarItem>
    </>
  );
}
```

- Items automatically appear when mounted, disappear when unmounted
- Higher `priority` values appear first
- Use any React component as content
- Works across bundle boundaries

## Settings

Settings are automatically saved to localStorage. Users can toggle monitors on/off via the toolbar settings modal (gear icon).
