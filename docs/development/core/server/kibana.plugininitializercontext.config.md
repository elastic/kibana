[Home](./index) &gt; [kibana](./kibana.md) &gt; [PluginInitializerContext](./kibana.plugininitializercontext.md) &gt; [config](./kibana.plugininitializercontext.config.md)

## PluginInitializerContext.config property

<b>Signature:</b>

```typescript
config: {
        create: <Schema extends Type<any>, Config>(ConfigClass: ConfigWithSchema<Schema, Config>) => Observable<Config>;
        createIfExists: <Schema extends Type<any>, Config>(ConfigClass: ConfigWithSchema<Schema, Config>) => Observable<Config | undefined>;
    };
```
