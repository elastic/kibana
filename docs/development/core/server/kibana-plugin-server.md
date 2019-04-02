[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md)

## kibana-plugin-server package

## Classes

|  Class | Description |
|  --- | --- |
|  [ClusterClient](./kibana-plugin-server.clusterclient.md) | Represents an Elasticsearch cluster API client and allows to call API on behalf of the internal Kibana user and the actual user that is derived from the request headers (via <code>asScoped(...)</code>). |
|  [ScopedClusterClient](./kibana-plugin-server.scopedclusterclient.md) | Serves the same purpose as "normal" <code>ClusterClient</code> but exposes additional <code>callAsCurrentUser</code> method that doesn't use credentials of the Kibana internal user (as <code>callAsInternalUser</code> does) to request Elasticsearch API, but rather passes HTTP headers extracted from the current user request to the API |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [CallAPIOptions](./kibana-plugin-server.callapioptions.md) | The set of options that defines how API call should be made and result be processed. |
|  [Logger](./kibana-plugin-server.logger.md) | Logger exposes all the necessary methods to log any type of information and this is the interface used by the logging consumers including plugins. |
|  [LoggerFactory](./kibana-plugin-server.loggerfactory.md) | The single purpose of <code>LoggerFactory</code> interface is to define a way to retrieve a context-based logger instance. |
|  [LogMeta](./kibana-plugin-server.logmeta.md) | Contextual metadata |
|  [PluginInitializerContext](./kibana-plugin-server.plugininitializercontext.md) | Context that's available to plugins during initialization stage. |
|  [PluginSetupContext](./kibana-plugin-server.pluginsetupcontext.md) | Context passed to the plugins <code>setup</code> method. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [APICaller](./kibana-plugin-server.apicaller.md) |  |
|  [ElasticsearchClientConfig](./kibana-plugin-server.elasticsearchclientconfig.md) | Config that consumers can pass to the Elasticsearch JS client is complex and includes not only entries from standard <code>elasticsearch.*</code> yaml config, but also some Elasticsearch JS client specific options like <code>keepAlive</code> or <code>plugins</code> (that eventually will be deprecated). |
|  [Headers](./kibana-plugin-server.headers.md) |  |
|  [PluginName](./kibana-plugin-server.pluginname.md) | Dedicated type for plugin name/id that is supposed to make Map/Set/Arrays that use it as a key or value more obvious. |

