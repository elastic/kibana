[Home](./index) &gt; [kibana](./kibana.md) &gt; [ElasticsearchServiceSetup](./kibana.elasticsearchservicesetup.md)

## ElasticsearchServiceSetup interface


<b>Signature:</b>

```typescript
export interface ElasticsearchServiceSetup 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [adminClient$](./kibana.elasticsearchservicesetup.adminclient$.md) | <code>Observable&lt;ClusterClient&gt;</code> |  |
|  [createClient](./kibana.elasticsearchservicesetup.createclient.md) | <code>(type: string, config: ElasticsearchClientConfig) =&gt; ClusterClient</code> |  |
|  [dataClient$](./kibana.elasticsearchservicesetup.dataclient$.md) | <code>Observable&lt;ClusterClient&gt;</code> |  |
|  [legacy](./kibana.elasticsearchservicesetup.legacy.md) | <code>{`<p/>`        readonly config$: Observable&lt;ElasticsearchConfig&gt;;`<p/>`    }</code> |  |

