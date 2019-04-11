[Home](./index) &gt; [kibana](./kibana.md) &gt; [UiSettingsClient](./kibana.uisettingsclient.md) &gt; [isDeclared](./kibana.uisettingsclient.isdeclared.md)

## UiSettingsClient.isDeclared() method

Returns true if the key is a "known" uiSetting, meaning it is either defined in the uiSettingDefaults or was previously added as a custom setting via the `set()` method.

<b>Signature:</b>

```typescript
isDeclared(key: string): boolean;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | <code>string</code> |  |

<b>Returns:</b>

`boolean`

