[Home](./index) &gt; [kibana](./kibana.md) &gt; [ClusterClient](./kibana.clusterclient.md) &gt; [asScoped](./kibana.clusterclient.asscoped.md)

## ClusterClient.asScoped() method

Creates an instance of `ScopedClusterClient` based on the configuration the current cluster client that exposes additional `callAsCurrentUser` method scoped to the provided . Consumers shouldn't worry about closing scoped client instances, these will be automatically closed as soon as the original cluster client isn't needed anymore and closed.

<b>Signature:</b>

```typescript
asScoped(req?: {
        headers?: Headers;
    }): ScopedClusterClient;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  req | `{`<p/>`        headers?: Headers;`<p/>`    }` |  |

<b>Returns:</b>

`ScopedClusterClient`

