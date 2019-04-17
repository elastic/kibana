[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [OnRequestToolkit](./kibana-plugin-server.onrequesttoolkit.md)

## OnRequestToolkit interface

A tool set defining an outcome of OnRequest interceptor for incoming request.

<b>Signature:</b>

```typescript
export interface OnRequestToolkit 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [next](./kibana-plugin-server.onrequesttoolkit.next.md) | <code>() =&gt; OnRequestResult</code> | To pass request to the next handler |
|  [redirected](./kibana-plugin-server.onrequesttoolkit.redirected.md) | <code>(url: string) =&gt; OnRequestResult</code> | To interrupt request handling and redirect to a configured url |
|  [rejected](./kibana-plugin-server.onrequesttoolkit.rejected.md) | <code>(error: Error, options?: {`<p/>`        statusCode?: number;`<p/>`    }) =&gt; OnRequestResult</code> | Fail the request with specified error. |

