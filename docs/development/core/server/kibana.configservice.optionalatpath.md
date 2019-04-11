[Home](./index) &gt; [kibana](./kibana.md) &gt; [ConfigService](./kibana.configservice.md) &gt; [optionalAtPath](./kibana.configservice.optionalatpath.md)

## ConfigService.optionalAtPath() method

Same as `atPath`<!-- -->, but returns `undefined` if there is no config at the specified path.

[ConfigService.atPath()](./kibana.configservice.atpath.md)

<b>Signature:</b>

```typescript
optionalAtPath<TSchema extends Type<any>, TConfig>(path: ConfigPath, ConfigClass: ConfigWithSchema<TSchema, TConfig>): Observable<TConfig | undefined>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  path | <code>ConfigPath</code> |  |
|  ConfigClass | <code>ConfigWithSchema&lt;TSchema, TConfig&gt;</code> |  |

<b>Returns:</b>

`Observable<TConfig | undefined>`

