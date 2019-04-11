[Home](./index) &gt; [kibana](./kibana.md) &gt; [ElasticsearchClientConfig](./kibana.elasticsearchclientconfig.md)

## ElasticsearchClientConfig type

<b>Signature:</b>

```typescript
export declare type ElasticsearchClientConfig = Pick<ConfigOptions, 'keepAlive' | 'log' | 'plugins'> & Pick<ElasticsearchConfig, 'apiVersion' | 'customHeaders' | 'logQueries' | 'requestHeadersWhitelist' | 'sniffOnStart' | 'sniffOnConnectionFault' | 'hosts' | 'username' | 'password'> & {
    pingTimeout?: ElasticsearchConfig['pingTimeout'] | ConfigOptions['pingTimeout'];
    requestTimeout?: ElasticsearchConfig['requestTimeout'] | ConfigOptions['requestTimeout'];
    sniffInterval?: ElasticsearchConfig['sniffInterval'] | ConfigOptions['sniffInterval'];
    ssl?: Partial<ElasticsearchConfig['ssl']>;
};
```
