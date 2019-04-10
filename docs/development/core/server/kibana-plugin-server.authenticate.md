[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [Authenticate](./kibana-plugin-server.authenticate.md)

## Authenticate type


<b>Signature:</b>

```typescript
export declare type Authenticate<T> = (request: Request, sessionStorage: SessionStorage<T>, t: typeof toolkit) => Promise<AuthResult>;
```
