[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ElasticsearchClientConfig](./kibana-plugin-server.elasticsearchclientconfig.md)

## ElasticsearchClientConfig type

Config that consumers can pass to the Elasticsearch JS client is complex and includes not only entries from standard `elasticsearch.*` yaml config, but also some Elasticsearch JS client specific options like `keepAlive` or `plugins` (that eventually will be deprecated).

<b>Signature:</b>

```typescript
export declare type ElasticsearchClientConfig = Pick<ConfigOptions, 'keepAlive' | 'log' | 'plugins'> & Pick<ElasticsearchConfig, 'apiVersion' | 'customHeaders' | 'logQueries' | 'requestHeadersWhitelist' | 'sniffOnStart' | 'sniffOnConnectionFault' | 'hosts' | 'username' | 'password'> & {
    pingTimeout?: ElasticsearchConfig['pingTimeout'] | ConfigOptions['pingTimeout'];
    requestTimeout?: ElasticsearchConfig['requestTimeout'] | ConfigOptions['requestTimeout'];
    sniffInterval?: ElasticsearchConfig['sniffInterval'] | ConfigOptions['sniffInterval'];
    ssl?: Partial<ElasticsearchConfig['ssl']>;
};
```
