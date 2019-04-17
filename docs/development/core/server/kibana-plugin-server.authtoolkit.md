[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [AuthToolkit](./kibana-plugin-server.authtoolkit.md)

## AuthToolkit interface

A tool set defining an outcome of Auth interceptor for incoming request.

<b>Signature:</b>

```typescript
export interface AuthToolkit 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [authenticated](./kibana-plugin-server.authtoolkit.authenticated.md) | <code>(credentials: any) =&gt; AuthResult</code> | Authentication is successful with given credentials, allow request to pass through |
|  [redirected](./kibana-plugin-server.authtoolkit.redirected.md) | <code>(url: string) =&gt; AuthResult</code> | Authentication requires to interrupt request handling and redirect to a configured url |
|  [rejected](./kibana-plugin-server.authtoolkit.rejected.md) | <code>(error: Error, options?: {`<p/>`        statusCode?: number;`<p/>`    }) =&gt; AuthResult</code> | Authentication is unsuccessful, fail the request with specified error. |

