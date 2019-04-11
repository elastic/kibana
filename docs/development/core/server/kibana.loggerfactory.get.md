[Home](./index) &gt; [kibana](./kibana.md) &gt; [LoggerFactory](./kibana.loggerfactory.md) &gt; [get](./kibana.loggerfactory.get.md)

## LoggerFactory.get() method

Returns a `Logger` instance for the specified context.

<b>Signature:</b>

```typescript
get(...contextParts: string[]): Logger;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  contextParts | <code>string[]</code> | Parts of the context to return logger for. For example get('plugins', 'pid') will return a logger for the <code>plugins.pid</code> context. |

<b>Returns:</b>

`Logger`

