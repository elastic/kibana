[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ScopedClusterClient](./kibana-plugin-server.scopedclusterclient.md) &gt; [callAsCurrentUser](./kibana-plugin-server.scopedclusterclient.callascurrentuser.md)

## ScopedClusterClient.callAsCurrentUser() method

Calls specified  with provided  on behalf of the user initiated request to the Kibana server (via HTTP request headers).

<b>Signature:</b>

```typescript
callAsCurrentUser(endpoint: string, clientParams?: Record<string, unknown>, options?: CallAPIOptions): Promise<unknown>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  endpoint | `string` | String descriptor of the endpoint e.g. `cluster.getSettings` or `ping`<!-- -->. |
|  clientParams | `Record<string, unknown>` | A dictionary of parameters that will be passed directly to the Elasticsearch JS client. |
|  options | `CallAPIOptions` | Options that affect the way we call the API and process the result. |

<b>Returns:</b>

`Promise<unknown>`

