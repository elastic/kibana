[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [PluginInitializer](./kibana-plugin-server.plugininitializer.md)

## PluginInitializer type

The `plugin` export at the root of a plugin's `server` directory should conform to this interface.

<b>Signature:</b>

```typescript
export declare type PluginInitializer<TSetup, TPluginsSetup extends Record<PluginName, unknown> = {}> = (coreContext: PluginInitializerContext) => Plugin<TSetup, TPluginsSetup>;
```
