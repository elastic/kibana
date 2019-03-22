[Home](./index) &gt; [kibana](./kibana.md) &gt; [ClusterClient](./kibana.clusterclient.md) &gt; [callAsInternalUser](./kibana.clusterclient.callasinternaluser.md)

## ClusterClient.callAsInternalUser property

Calls specified endpoint with provided clientParams on behalf of the Kibana internal user.

<b>Signature:</b>

```typescript
callAsInternalUser: (endpoint: string, clientParams?: Record<string, unknown>, options?: CallAPIOptions | undefined) => Promise<any>;
```
