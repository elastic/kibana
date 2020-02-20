# Share plugin

Replaces the legacy `ui/share` module for registering share context menus.

## Example registration

```ts
// For legacy plugins
import { npSetup } from 'ui/new_platform';
npSetup.plugins.share.register(/* same details here */);

// For new plugins: first add 'share' to the list of `optionalPlugins` 
// in your kibana.json file. Then access the plugin directly in `setup`:

class MyPlugin {
  setup(core, plugins) {
    if (plugins.share) {
      plugins.share.register(/* same details here. */);
    }
  }
}
```

Note that the old module supported providing a Angular DI function to receive Angular dependencies. This is no longer supported as we migrate away from Angular and will be removed in 8.0.
