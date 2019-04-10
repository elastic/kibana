[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ConfigService](./kibana-plugin-server.configservice.md) &gt; [atPath](./kibana-plugin-server.configservice.atpath.md)

## ConfigService.atPath() method

Reads the subset of the config at the specified `path` and validates it against the static `schema` on the given `ConfigClass`<!-- -->.

<b>Signature:</b>

```typescript
atPath<TSchema extends Type<any>, TConfig>(path: ConfigPath, ConfigClass: ConfigWithSchema<TSchema, TConfig>): Observable<TConfig>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  path | <code>ConfigPath</code> | The path to the desired subset of the config. |
|  ConfigClass | <code>ConfigWithSchema&lt;TSchema, TConfig&gt;</code> | A class (not an instance of a class) that contains a static <code>schema</code> that we validate the config at the given <code>path</code> against. |

<b>Returns:</b>

`Observable<TConfig>`

