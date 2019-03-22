[Home](./index) &gt; [kibana](./kibana.md) &gt; [ClusterClient](./kibana.clusterclient.md)

## ClusterClient class

Represents an Elasticsearch cluster API client and allows to call API on behalf of the internal Kibana user and the actual user that is derived from the request headers (via `asScoped(...)`<!-- -->).

<b>Signature:</b>

```typescript
export declare class ClusterClient 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [callAsInternalUser](./kibana.clusterclient.callasinternaluser.md) |  | `(endpoint: string, clientParams?: Record<string, unknown>, options?: CallAPIOptions | undefined) => Promise<any>` | Calls specified endpoint with provided clientParams on behalf of the Kibana internal user. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [asScoped(req)](./kibana.clusterclient.asscoped.md) |  | Creates an instance of `ScopedClusterClient` based on the configuration the current cluster client that exposes additional `callAsCurrentUser` method scoped to the provided req. Consumers shouldn't worry about closing scoped client instances, these will be automatically closed as soon as the original cluster client isn't needed anymore and closed. |
|  [close()](./kibana.clusterclient.close.md) |  | Closes the cluster client. After that client cannot be used and one should create a new client instance to be able to interact with Elasticsearch API. |

