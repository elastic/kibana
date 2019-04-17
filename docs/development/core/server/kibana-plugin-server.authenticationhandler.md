[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [AuthenticationHandler](./kibana-plugin-server.authenticationhandler.md)

## AuthenticationHandler type


<b>Signature:</b>

```typescript
export declare type AuthenticationHandler<T> = (request: Request, sessionStorage: SessionStorage<T>, t: AuthToolkit) => Promise<AuthResult>;
```
