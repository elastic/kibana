[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [PluginInitializerContext](./kibana-plugin-server.plugininitializercontext.md)

## PluginInitializerContext interface

Context that's available to plugins during initialization stage.

<b>Signature:</b>

```typescript
export interface PluginInitializerContext 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [config](./kibana-plugin-server.plugininitializercontext.config.md) | `{`<p/>`        create: <Schema extends Type<any>, Config>(ConfigClass: ConfigWithSchema<Schema, Config>) => Observable<Config>;`<p/>`        createIfExists: <Schema extends Type<any>, Config>(ConfigClass: ConfigWithSchema<Schema, Config>) => Observable<Config | undefined>;`<p/>`    }` |  |
|  [env](./kibana-plugin-server.plugininitializercontext.env.md) | `{`<p/>`        mode: EnvironmentMode;`<p/>`    }` |  |
|  [logger](./kibana-plugin-server.plugininitializercontext.logger.md) | `LoggerFactory` |  |

