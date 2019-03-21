[Home](./index) &gt; [kibana](./kibana.md) &gt; [PluginStartContext](./kibana.pluginstartcontext.md)

## PluginStartContext interface

Context passed to the plugins `start` method.

<b>Signature:</b>

```typescript
export interface PluginStartContext 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [elasticsearch](./kibana.pluginstartcontext.elasticsearch.md) | `{`<p/>`        adminClient$: Observable<ClusterClient>;`<p/>`        dataClient$: Observable<ClusterClient>;`<p/>`    }` |  |

