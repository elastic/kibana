# home plugin
Moves the legacy `ui/registry/feature_catalogue` module for registering "features" that should be shown in the home page's feature catalogue to a service within a "home" plugin. The feature catalogue refered to here should not be confused with the "feature" plugin for registering features used to derive UI capabilities for feature controls.

# Feature catalogue (public service)

Replaces the legacy `ui/registry/feature_catalogue` module for registering "features" that should be showed in the home
page's feature catalogue. This should not be confused with the "feature" plugin for registering features used to derive
UI capabilities for feature controls.

## Example registration

```ts
// For legacy plugins
import { npSetup } from 'ui/new_platform';
npSetup.plugins.home.featureCatalogue.register(/* same details here */);

// For new plugins: first add 'home` to the list of `optionalPlugins` 
// in your kibana.json file. Then access the plugin directly in `setup`:

class MyPlugin {
  setup(core, plugins) {
    if (plugins.home) {
      plugins.home.featureCatalgoue.register(/* same details here. */);
    }
  }
}
```

Note that the old module supported providing a Angular DI function to receive Angular dependencies. This is no longer supported as we migrate away from Angular and will be removed in 8.0.
