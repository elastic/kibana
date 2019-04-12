[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [OnRequest](./kibana-plugin-server.onrequest.md)

## OnRequest type


<b>Signature:</b>

```typescript
export declare type OnRequest<Params = any, Query = any, Body = any> = (req: KibanaRequest<Params, Query, Body>, t: OnRequestToolkit) => OnRequestResult | Promise<OnRequestResult>;
```
