[Home](./index) &gt; [kibana](./kibana.md) &gt; [ConfigService](./kibana.configservice.md) &gt; [getConfig$](./kibana.configservice.getconfig$.md)

## ConfigService.getConfig$() method

Returns the full config object observable. This is not intended for "normal use", but for features that \_need\_ access to the full object.

<b>Signature:</b>

```typescript
getConfig$(): Observable<Config>;
```
<b>Returns:</b>

`Observable<Config>`

