# @kbn/developer-toolbar

A development toolbar for Kibana that provides real-time performance monitoring and debugging tools.

## Features

- **Performance Monitoring**: Frame jank detection, long task tracking, and memory usage indicators
- **Console Error Tracking**: Automatic capture and display of console errors and warnings  
- **Environment Info**: Display current environment and build information
- **Extensible Actions**: Add custom toolbar actions using React components

## Usage

```tsx
import { 
  DeveloperToolbar, 
  DeveloperToolbarProvider,
  DeveloperToolbarAction 
} from '@kbn/developer-toolbar';

// Wrap your app with the provider
function App() {
  return (
    <DeveloperToolbarProvider>
      <MyApp />
      <DeveloperToolbar position="fixed" />
    </DeveloperToolbarProvider>
  );
}

// Add custom actions anywhere in your component tree
function MyComponent() {
  return (
    <div>
      <h1>My Feature</h1>
      <DeveloperToolbarAction priority={10} tooltip="Debug Feature">
        <EuiButtonIcon iconType="inspect" onClick={handleDebug} />
      </DeveloperToolbarAction>
    </div>
  );
}
```

## Action System

Actions are rendered declaratively using `<DeveloperToolbarAction>` components:

- **Auto-registration**: Actions appear when components mount, disappear when they unmount
- **Priority ordering**: Higher priority numbers appear first in the toolbar
- **Flexible content**: Any React component can be used as action content
- **Context-aware**: Works across bundle boundaries via global registry

## Package Info

- **Type**: `shared-browser`
- **Owner**: `@elastic/appex-sharedux` 
- **Visibility**: `private`
