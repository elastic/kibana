[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [OnRequestToolkit](./kibana-plugin-server.onrequesttoolkit.md) &gt; [rejected](./kibana-plugin-server.onrequesttoolkit.rejected.md)

## OnRequestToolkit.rejected property

Fail the request with specified error.

<b>Signature:</b>

```typescript
rejected: (error: Error, options?: {
        statusCode?: number;
    }) => OnRequestResult;
```
