# Feature catalogue plugin

Replaces the legacy `ui/registry/feature_catalogue` module for registering "features" that should be showed in the home
page's feature catalogue. This should not be confused with the "feature" plugin for registering features used to derive
UI capabilities for feature controls.

## Example registration

```ts
// For legacy plugins
import { npSetup } from 'ui/new_platform';
npSetup.plugins.feature_catalogue.register(/* same details here */);

// For new plugins: first add 'feature_catalogue` to the list of `optionalPlugins` 
// in your kibana.json file. Then access the plugin directly in `setup`:

class MyPlugin {
  setup(core, plugins) {
    if (plugins.feature_catalogue) {
      plugins.feature_catalogue.register(/* same details here. */);
    }
  }
}
```

Note that the old module supported providing a Angular DI function to receive Angular dependencies. This is no longer supported as we migrate away from Angular and will be removed in 8.0.
