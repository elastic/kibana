[Home](./index) &gt; [kibana](./kibana.md) &gt; [PluginSetupContext](./kibana.pluginsetupcontext.md)

## PluginSetupContext interface

Context passed to the plugins `setup` method.

<b>Signature:</b>

```typescript
export interface PluginSetupContext 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [elasticsearch](./kibana.pluginsetupcontext.elasticsearch.md) | `{`<p/>`        adminClient$: Observable<ClusterClient>;`<p/>`        dataClient$: Observable<ClusterClient>;`<p/>`    }` |  |

