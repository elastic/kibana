[Home](./index) &gt; [kibana](./kibana.md) &gt; [UiSettingsClient](./kibana.uisettingsclient.md) &gt; [getSaved$](./kibana.uisettingsclient.getsaved$.md)

## UiSettingsClient.getSaved$() method

Returns an Observable that notifies subscribers of each update to the uiSettings, including the key, newValue, and oldValue of the setting that changed.

<b>Signature:</b>

```typescript
getSaved$(): Rx.Observable<{
        key: string;
        newValue: any;
        oldValue: any;
    }>;
```
<b>Returns:</b>

`Rx.Observable<{
        key: string;
        newValue: any;
        oldValue: any;
    }>`

