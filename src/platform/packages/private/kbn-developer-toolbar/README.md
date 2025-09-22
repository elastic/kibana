# @kbn/developer-toolbar

A development toolbar for Kibana that provides real-time performance monitoring and debugging tools.

## Features

- **Performance Monitoring**: Frame jank detection, long task tracking, and memory usage indicators
- **Console Error Tracking**: Automatic capture and display of console errors and warnings
- **Environment Info**: Display current environment and build information
- **Extensible Items**: Add custom toolbar items using React components

## Usage

```tsx
import {
  DeveloperToolbar,
  DeveloperToolbarProvider,
  DeveloperToolbarItem,
} from '@kbn/developer-toolbar';

// Wrap your app with the provider
function App() {
  return (
    <DeveloperToolbarProvider>
      <MyApp />
      <DeveloperToolbar />
    </DeveloperToolbarProvider>
  );
}

// Add custom items anywhere in your component tree
function MyComponent() {
  return (
    <div>
      <h1>My Feature</h1>
      <DeveloperToolbarItem priority={10} name="Debug Feature">
        <EuiButtonIcon iconType="inspect" onClick={handleDebug} />
      </DeveloperToolbarItem>
    </div>
  );
}
```

## Item System

Items are rendered declaratively using `<DeveloperToolbarItem>` components:

- **Auto-registration**: Items appear when components mount, disappear when they unmount
- **Priority ordering**: Higher priority numbers appear first in the toolbar
- **Flexible content**: Any React component can be used as item content
- **Context-aware**: Works across bundle boundaries via global registry
