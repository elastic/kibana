[Home](./index) &gt; [kibana](./kibana.md) &gt; [Logger](./kibana.logger.md)

## Logger interface

Logger exposes all the necessary methods to log any type of information and this is the interface used by the logging consumers including plugins.

<b>Signature:</b>

```typescript
export interface Logger 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [debug(message, meta)](./kibana.logger.debug.md) | Log messages useful for debugging and interactive investigation |
|  [error(errorOrMessage, meta)](./kibana.logger.error.md) | Logs abnormal or unexpected errors or messages that caused a failure in the application flow |
|  [fatal(errorOrMessage, meta)](./kibana.logger.fatal.md) | Logs abnormal or unexpected errors or messages that caused an unrecoverable failure |
|  [info(message, meta)](./kibana.logger.info.md) | Logs messages related to general application flow |
|  [trace(message, meta)](./kibana.logger.trace.md) | Log messages at the most detailed log level |
|  [warn(errorOrMessage, meta)](./kibana.logger.warn.md) | Logs abnormal or unexpected errors or messages |

