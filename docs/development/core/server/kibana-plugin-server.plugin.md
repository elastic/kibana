[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [Plugin](./kibana-plugin-server.plugin.md)

## Plugin interface

The interface that should be returned by a `PluginInitializer`<!-- -->.

<b>Signature:</b>

```typescript
export interface Plugin<TSetup, TPluginsSetup extends Record<PluginName, unknown> = 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [setup](./kibana-plugin-server.plugin.setup.md) | <code>(pluginSetupContext: PluginSetupContext, plugins: TPluginsSetup) =&gt; TSetup &#124; Promise&lt;TSetup&gt;</code> |  |
|  [stop](./kibana-plugin-server.plugin.stop.md) | <code>() =&gt; void</code> |  |

