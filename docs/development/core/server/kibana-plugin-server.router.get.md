[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [Router](./kibana-plugin-server.router.md) &gt; [get](./kibana-plugin-server.router.get.md)

## Router.get() method

Register a `GET` request with the router

<b>Signature:</b>

```typescript
get<P extends ObjectType, Q extends ObjectType, B extends ObjectType>(route: RouteConfig<P, Q, B>, handler: RequestHandler<P, Q, B>): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  route | <code>RouteConfig&lt;P, Q, B&gt;</code> |  |
|  handler | <code>RequestHandler&lt;P, Q, B&gt;</code> |  |

<b>Returns:</b>

`void`

