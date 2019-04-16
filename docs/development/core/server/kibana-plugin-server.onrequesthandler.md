[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [OnRequestHandler](./kibana-plugin-server.onrequesthandler.md)

## OnRequestHandler type


<b>Signature:</b>

```typescript
export declare type OnRequestHandler<Params = any, Query = any, Body = any> = (req: KibanaRequest<Params, Query, Body>, t: OnRequestToolkit) => OnRequestResult | Promise<OnRequestResult>;
```
