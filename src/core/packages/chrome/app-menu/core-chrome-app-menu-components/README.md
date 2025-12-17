# AppMenuComponent

`AppMenuComponent` is the replacement for the existing `TopNavMenu` component, providing an improved API and enhanced functionality for building app menu in your application.

## Usage

- Direct import:

```typescript
import { AppMenuComponent } from '@kbn/core-chrome-app-menu-components'

const MyComponent = (config: AppMenuConfig) => {

  return <AppMenu config={config} />
}
```
