[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [Router](./kibana-plugin-server.router.md) &gt; [put](./kibana-plugin-server.router.put.md)

## Router.put() method

Register a `PUT` request with the router

<b>Signature:</b>

```typescript
put<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  route | <code>RouteConfig&lt;P, Q, B&gt;</code> |  |
|  handler | <code>RequestHandler&lt;P, Q, B&gt;</code> |  |

<b>Returns:</b>

`void`

