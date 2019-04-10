[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ClusterClient](./kibana-plugin-server.clusterclient.md) &gt; [callAsInternalUser](./kibana-plugin-server.clusterclient.callasinternaluser.md)

## ClusterClient.callAsInternalUser property

Calls specified endpoint with provided clientParams on behalf of the Kibana internal user.

<b>Signature:</b>

```typescript
callAsInternalUser: (endpoint: string, clientParams?: Record<string, unknown>, options?: CallAPIOptions | undefined) => Promise<any>;
```
