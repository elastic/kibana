[Home](./index) &gt; [kibana](./kibana.md) &gt; [UiSettingsClient](./kibana.uisettingsclient.md) &gt; [get$](./kibana.uisettingsclient.get$.md)

## UiSettingsClient.get$() method

Gets an observable of the current value for a config key, and all updates to that config key in the future. Providing a `defaultOverride` argument behaves the same as it does in \#get()

<b>Signature:</b>

```typescript
get$(key: string, defaultOverride?: any): Rx.Observable<any>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | <code>string</code> |  |
|  defaultOverride | <code>any</code> |  |

<b>Returns:</b>

`Rx.Observable<any>`

