[Home](./index) &gt; [kibana-plugin-server](./kibana-plugin-server.md) &gt; [ConfigService](./kibana-plugin-server.configservice.md) &gt; [getConfig$](./kibana-plugin-server.configservice.getconfig$.md)

## ConfigService.getConfig$() method

Returns the full config object observable. This is not intended for "normal use", but for features that \_need\_ access to the full object.

<b>Signature:</b>

```typescript
getConfig$(): Observable<Config>;
```
<b>Returns:</b>

`Observable<Config>`

