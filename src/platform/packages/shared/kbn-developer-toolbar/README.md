# @kbn/developer-toolbar

A development toolbar for Kibana with real-time performance monitoring and custom debugging tools.

## Features

- **Frame Jank Monitor**: FPS with jank percentage (seconds below 85% of the display's refresh rate), long tasks and blocking time, and slow interaction latency
- **Memory Usage**: Chromium's estimated JavaScript heap size, heap pressure, and steady heap growth (a hint, not a confirmed leak)
- **Console Errors**: Captures and displays console errors and warnings in real-time
- **Environment Info**: Shows current environment and build information
- **Custom Items**: Register items through the `developerToolbar` plugin contract

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

Register items on the `developerToolbar` plugin contract (`optionalPlugins: ["developerToolbar"]`):

```tsx
public start(core: CoreStart, plugins: { developerToolbar?: DeveloperToolbarStart }) {
  plugins.developerToolbar?.registerItem({
    id: 'my-debug-tool',
    priority: 10,
    children: <EuiButtonIcon iconType="inspect" onClick={handleDebug} />,
  });
}
```

- Higher `priority` values appear first
- Use any React node as `children`

## Settings

Settings are automatically saved to localStorage. Users can toggle monitors on/off via the toolbar settings modal (gear icon).
