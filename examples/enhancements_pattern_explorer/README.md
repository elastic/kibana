## Enhancements pattern

This plugin shows a recommended pattern for how one plugin can enhance another plugins functionality when
dealing with a registry of items.

There are three key pieces. The plugin that creates the registry should:

- Expose a `setCustomProvider` function in the Setup contract.
- Expose the ability for other plugins to register _definitions_ in the setup contract.
- Expose the ability for other plugins to retrieve _instances_ in the start contract.

There are three plugin associated with this example. 

- the `greeting` plugin exposes a registry of greetings.  The default provider uses the very basic `alert` function to greet the user.
- the `greetingEnhanced` plugin registers a custom greeting provider which uses an EuiModal to greet the user with improved stylign.
- this plugin, `enhancementsPatternExplorer` registers a few example greetings as well as an app to expose the `greet` functionality.

To see how this works, first run Kibana with nothing in your `kibana.yml` via `yarn start --run-examples`.  Navigate to the Enhancements pattern
app and see how the greetings look.

Then, stop kibana and edit `kibana.yml` to turn the `greetingEnhanced` plugin off by adding this line:

```
greeting_enhanced.enabled: false
```

Restart kibana and go through the same motions, and you should now see just the basic `alert` window.