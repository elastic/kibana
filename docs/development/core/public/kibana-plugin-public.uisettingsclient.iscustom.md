[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [UiSettingsClient](./kibana-plugin-public.uisettingsclient.md) &gt; [isCustom](./kibana-plugin-public.uisettingsclient.iscustom.md)

## UiSettingsClient.isCustom() method

Returns true if the setting is not a part of the uiSettingDefaults, but was either added directly via `set()`<!-- -->, or is an unknown setting found in the uiSettings saved object

<b>Signature:</b>

```typescript
isCustom(key: string): boolean;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | <code>string</code> |  |

<b>Returns:</b>

`boolean`

