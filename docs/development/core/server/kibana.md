[Home](./index) &gt; [kibana](./kibana.md)

## kibana package

## Classes

|  Class | Description |
|  --- | --- |
|  [ClusterClient](./kibana.clusterclient.md) | Represents an Elasticsearch cluster API client and allows to call API on behalf of the internal Kibana user and the actual user that is derived from the request headers (via `asScoped(...)`<!-- -->). |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [CallAPIOptions](./kibana.callapioptions.md) | The set of options that defines how API call should be made and result be processed. |
|  [Logger](./kibana.logger.md) | Logger exposes all the necessary methods to log any type of information and this is the interface used by the logging consumers including plugins. |
|  [LoggerFactory](./kibana.loggerfactory.md) | The single purpose of `LoggerFactory` interface is to define a way to retrieve a context-based logger instance. |
|  [LogMeta](./kibana.logmeta.md) | Contextual metadata |
|  [PluginInitializerContext](./kibana.plugininitializercontext.md) | Context that's available to plugins during initialization stage. |
|  [PluginSetupContext](./kibana.pluginsetupcontext.md) | Context passed to the plugins `setup` method. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [PluginName](./kibana.pluginname.md) | Dedicated type for plugin name/id that is supposed to make Map/Set/Arrays that use it as a key or value more obvious. |

