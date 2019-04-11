[Home](./index) &gt; [kibana](./kibana.md) &gt; [PluginInitializerContext](./kibana.plugininitializercontext.md)

## PluginInitializerContext interface

Context that's available to plugins during initialization stage.

<b>Signature:</b>

```typescript
export interface PluginInitializerContext 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [config](./kibana.plugininitializercontext.config.md) | <code>{`<p/>`        create: &lt;Schema extends Type&lt;any&gt;, Config&gt;(ConfigClass: ConfigWithSchema&lt;Schema, Config&gt;) =&gt; Observable&lt;Config&gt;;`<p/>`        createIfExists: &lt;Schema extends Type&lt;any&gt;, Config&gt;(ConfigClass: ConfigWithSchema&lt;Schema, Config&gt;) =&gt; Observable&lt;Config &#124; undefined&gt;;`<p/>`    }</code> |  |
|  [env](./kibana.plugininitializercontext.env.md) | <code>{`<p/>`        mode: EnvironmentMode;`<p/>`    }</code> |  |
|  [logger](./kibana.plugininitializercontext.logger.md) | <code>LoggerFactory</code> |  |

