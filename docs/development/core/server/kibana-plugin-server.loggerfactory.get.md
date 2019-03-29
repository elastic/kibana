[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [LoggerFactory](./kibana-plugin-server.loggerfactory.md) &gt; [get](./kibana-plugin-server.loggerfactory.get.md)

## LoggerFactory.get() method

Returns a `Logger` instance for the specified context.

<b>Signature:</b>

```typescript
get(...contextParts: string[]): Logger;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  contextParts | `string[]` | Parts of the context to return logger for. For example get('plugins', 'pid') will return a logger for the `plugins.pid` context. |

<b>Returns:</b>

`Logger`

