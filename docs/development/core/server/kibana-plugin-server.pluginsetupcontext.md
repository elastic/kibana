[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [PluginSetupContext](./kibana-plugin-server.pluginsetupcontext.md)

## PluginSetupContext interface

Context passed to the plugins `setup` method.

<b>Signature:</b>

```typescript
export interface PluginSetupContext 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [elasticsearch](./kibana-plugin-server.pluginsetupcontext.elasticsearch.md) | `{`<p/>`        adminClient$: Observable<ClusterClient>;`<p/>`        dataClient$: Observable<ClusterClient>;`<p/>`    }` |  |

