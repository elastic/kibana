[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ElasticsearchServiceSetup](./kibana-plugin-server.elasticsearchservicesetup.md)

## ElasticsearchServiceSetup interface


<b>Signature:</b>

```typescript
export interface ElasticsearchServiceSetup 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [adminClient$](./kibana-plugin-server.elasticsearchservicesetup.adminclient$.md) | <code>Observable&lt;ClusterClient&gt;</code> |  |
|  [createClient](./kibana-plugin-server.elasticsearchservicesetup.createclient.md) | <code>(type: string, config: ElasticsearchClientConfig) =&gt; ClusterClient</code> |  |
|  [dataClient$](./kibana-plugin-server.elasticsearchservicesetup.dataclient$.md) | <code>Observable&lt;ClusterClient&gt;</code> |  |
|  [legacy](./kibana-plugin-server.elasticsearchservicesetup.legacy.md) | <code>{`<p/>`        readonly config$: Observable&lt;ElasticsearchConfig&gt;;`<p/>`    }</code> |  |

