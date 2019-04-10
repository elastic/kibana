[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ScopedClusterClient](./kibana-plugin-server.scopedclusterclient.md) &gt; [callAsInternalUser](./kibana-plugin-server.scopedclusterclient.callasinternaluser.md)

## ScopedClusterClient.callAsInternalUser() method

Calls specified `endpoint` with provided `clientParams` on behalf of the Kibana internal user.

<b>Signature:</b>

```typescript
callAsInternalUser(endpoint: string, clientParams?: Record<string, unknown>, options?: CallAPIOptions): Promise<unknown>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  endpoint | <code>string</code> | String descriptor of the endpoint e.g. <code>cluster.getSettings</code> or <code>ping</code>. |
|  clientParams | <code>Record&lt;string, unknown&gt;</code> | A dictionary of parameters that will be passed directly to the Elasticsearch JS client. |
|  options | <code>CallAPIOptions</code> | Options that affect the way we call the API and process the result. |

<b>Returns:</b>

`Promise<unknown>`

