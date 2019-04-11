[Home](./index) &gt; [kibana](./kibana.md) &gt; [PluginInitializer](./kibana.plugininitializer.md)

## PluginInitializer type

The `plugin` export at the root of a plugin's `public` directory should conform to this interface.

<b>Signature:</b>

```typescript
export declare type PluginInitializer<TSetup, TPluginsSetup extends Record<string, unknown> = {}> = (core: PluginInitializerContext) => Plugin<TSetup, TPluginsSetup>;
```
