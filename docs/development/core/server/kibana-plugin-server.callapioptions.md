[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [CallAPIOptions](./kibana-plugin-server.callapioptions.md)

## CallAPIOptions interface

The set of options that defines how API call should be made and result be processed.

<b>Signature:</b>

```typescript
export interface CallAPIOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [wrap401Errors](./kibana-plugin-server.callapioptions.wrap401errors.md) | `boolean` | Indicates whether `401 Unauthorized` errors returned from the Elasticsearch API should be wrapped into `Boom` error instances with properly set `WWW-Authenticate` header that could have been returned by the API itself. If API didn't specify that then `Basic realm="Authorization Required"` is used as `WWW-Authenticate`<!-- -->. |

