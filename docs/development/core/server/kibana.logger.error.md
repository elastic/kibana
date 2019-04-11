[Home](./index) &gt; [kibana](./kibana.md) &gt; [Logger](./kibana.logger.md) &gt; [error](./kibana.logger.error.md)

## Logger.error() method

Logs abnormal or unexpected errors or messages that caused a failure in the application flow

<b>Signature:</b>

```typescript
error(errorOrMessage: string | Error, meta?: LogMeta): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  errorOrMessage | <code>string &#124; Error</code> | An Error object or message string to log |
|  meta | <code>LogMeta</code> |  |

<b>Returns:</b>

`void`

