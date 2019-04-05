[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ClusterClient](./kibana-plugin-server.clusterclient.md)

## ClusterClient class

Represents an Elasticsearch cluster API client and allows to call API on behalf of the internal Kibana user and the actual user that is derived from the request headers (via `asScoped(...)`<!-- -->).

<b>Signature:</b>

```typescript
export declare class ClusterClient 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [callAsInternalUser](./kibana-plugin-server.clusterclient.callasinternaluser.md) |  | <code>(endpoint: string, clientParams?: Record&lt;string, unknown&gt;, options?: CallAPIOptions &#124; undefined) =&gt; Promise&lt;any&gt;</code> | Calls specified endpoint with provided clientParams on behalf of the Kibana internal user. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [asScoped(req)](./kibana-plugin-server.clusterclient.asscoped.md) |  | Creates an instance of <code>ScopedClusterClient</code> based on the configuration the current cluster client that exposes additional <code>callAsCurrentUser</code> method scoped to the provided req. Consumers shouldn't worry about closing scoped client instances, these will be automatically closed as soon as the original cluster client isn't needed anymore and closed. |
|  [close()](./kibana-plugin-server.clusterclient.close.md) |  | Closes the cluster client. After that client cannot be used and one should create a new client instance to be able to interact with Elasticsearch API. |

