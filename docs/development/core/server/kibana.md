[Home](./index) &gt; [kibana](./kibana.md)

## kibana package

## Classes

|  Class | Description |
|  --- | --- |
|  [ClusterClient](./kibana.clusterclient.md) | Represents an Elasticsearch cluster API client and allows to call API on behalf of the internal Kibana user and the actual user that is derived from the request headers (via <code>asScoped(...)</code>). |
|  [ConfigService](./kibana.configservice.md) |  |
|  [ScopedClusterClient](./kibana.scopedclusterclient.md) | Serves the same purpose as "normal" <code>ClusterClient</code> but exposes additional <code>callAsCurrentUser</code> method that doesn't use credentials of the Kibana internal user (as <code>callAsInternalUser</code> does) to request Elasticsearch API, but rather passes HTTP headers extracted from the current user request to the API |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [CallAPIOptions](./kibana.callapioptions.md) | The set of options that defines how API call should be made and result be processed. |
|  [CoreSetup](./kibana.coresetup.md) |  |
|  [ElasticsearchServiceSetup](./kibana.elasticsearchservicesetup.md) |  |
|  [Logger](./kibana.logger.md) | Logger exposes all the necessary methods to log any type of information and this is the interface used by the logging consumers including plugins. |
|  [LoggerFactory](./kibana.loggerfactory.md) | The single purpose of <code>LoggerFactory</code> interface is to define a way to retrieve a context-based logger instance. |
|  [LogMeta](./kibana.logmeta.md) | Contextual metadata |
|  [Plugin](./kibana.plugin.md) | The interface that should be returned by a <code>PluginInitializer</code>. |
|  [PluginInitializerContext](./kibana.plugininitializercontext.md) | Context that's available to plugins during initialization stage. |
|  [PluginSetupContext](./kibana.pluginsetupcontext.md) | Context passed to the plugins <code>setup</code> method. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [APICaller](./kibana.apicaller.md) |  |
|  [ElasticsearchClientConfig](./kibana.elasticsearchclientconfig.md) |  |
|  [Headers](./kibana.headers.md) |  |
|  [PluginInitializer](./kibana.plugininitializer.md) | The <code>plugin</code> export at the root of a plugin's <code>server</code> directory should conform to this interface. |
|  [PluginName](./kibana.pluginname.md) | Dedicated type for plugin name/id that is supposed to make Map/Set/Arrays that use it as a key or value more obvious. |

