[Home](./index) &gt; [kibana](./kibana.md) &gt; [PluginInitializerContext](./kibana.plugininitializercontext.md)

## PluginInitializerContext interface

Core API's exposed to plugins on initialization

<b>Signature:</b>

```typescript
export interface PluginInitializerContext 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [config](./kibana.plugininitializercontext.config.md) | `{`<p/>`        create: <Schema extends Type<any>, Config>(ConfigClass: ConfigWithSchema<Schema, Config>) => Observable<Config>;`<p/>`        createIfExists: <Schema extends Type<any>, Config>(ConfigClass: ConfigWithSchema<Schema, Config>) => Observable<Config | undefined>;`<p/>`    }` |  |
|  [env](./kibana.plugininitializercontext.env.md) | `{`<p/>`        mode: EnvironmentMode;`<p/>`    }` |  |
|  [logger](./kibana.plugininitializercontext.logger.md) | `LoggerFactory` |  |

