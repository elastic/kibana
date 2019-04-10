[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [PluginInitializer](./kibana-plugin-public.plugininitializer.md)

## PluginInitializer type

The `plugin` export at the root of a plugin's `public` directory should conform to this interface.

<b>Signature:</b>

```typescript
export declare type PluginInitializer<TSetup, TPluginsSetup extends Record<string, unknown> = {}> = (core: PluginInitializerContext) => Plugin<TSetup, TPluginsSetup>;
```
