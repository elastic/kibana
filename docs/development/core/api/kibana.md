[Home](./index) &gt; [kibana](./kibana.md)

## kibana package

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [Logger](./kibana.logger.md) | Logger exposes all the necessary methods to log any type of information and this is the interface used by the logging consumers including plugins. |
|  [LoggerFactory](./kibana.loggerfactory.md) | The single purpose of `LoggerFactory` interface is to define a way to retrieve a context-based logger instance. |
|  [PluginInitializerContext](./kibana.plugininitializercontext.md) | Core API's exposed to plugins on initialization |
|  [PluginStartContext](./kibana.pluginstartcontext.md) | Core API's exposed to plugins on `start()` |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [PluginName](./kibana.pluginname.md) | Dedicated type for plugin name/id that is supposed to make Map/Set/Arrays that use it as a key or value more obvious. |

