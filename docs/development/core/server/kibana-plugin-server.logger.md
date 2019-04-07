[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [Logger](./kibana-plugin-server.logger.md)

## Logger interface

Logger exposes all the necessary methods to log any type of information and this is the interface used by the logging consumers including plugins.

<b>Signature:</b>

```typescript
export interface Logger 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [debug(message, meta)](./kibana-plugin-server.logger.debug.md) | Log messages useful for debugging and interactive investigation |
|  [error(errorOrMessage, meta)](./kibana-plugin-server.logger.error.md) | Logs abnormal or unexpected errors or messages that caused a failure in the application flow |
|  [fatal(errorOrMessage, meta)](./kibana-plugin-server.logger.fatal.md) | Logs abnormal or unexpected errors or messages that caused an unrecoverable failure |
|  [info(message, meta)](./kibana-plugin-server.logger.info.md) | Logs messages related to general application flow |
|  [trace(message, meta)](./kibana-plugin-server.logger.trace.md) | Log messages at the most detailed log level |
|  [warn(errorOrMessage, meta)](./kibana-plugin-server.logger.warn.md) | Logs abnormal or unexpected errors or messages |

