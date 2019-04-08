[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [UiSettingsClient](./kibana-plugin-public.uisettingsclient.md) &gt; [set](./kibana-plugin-public.uisettingsclient.set.md)

## UiSettingsClient.set() method

Sets the value for a uiSetting. If the setting is not defined in the uiSettingDefaults it will be stored as a custom setting. The new value will be synchronously available via the `get()` method and sent to the server in the background. If the request to the server fails then a toast notification will be displayed and the setting will be reverted it its value before `set()` was called.

<b>Signature:</b>

```typescript
set(key: string, val: any): Promise<boolean>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | <code>string</code> |  |
|  val | <code>any</code> |  |

<b>Returns:</b>

`Promise<boolean>`

