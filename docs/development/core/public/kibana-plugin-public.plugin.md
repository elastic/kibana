[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [Plugin](./kibana-plugin-public.plugin.md)

## Plugin interface

The interface that should be returned by a `PluginInitializer`<!-- -->.

<b>Signature:</b>

```typescript
export interface Plugin<TSetup, TPluginsSetup extends Record<string, unknown> = 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [setup](./kibana-plugin-public.plugin.setup.md) | <code>(core: PluginSetupContext, plugins: TPluginsSetup) =&gt; TSetup &#124; Promise&lt;TSetup&gt;</code> |  |
|  [stop](./kibana-plugin-public.plugin.stop.md) | <code>() =&gt; void</code> |  |

