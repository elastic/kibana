[Home](./index) &gt; [kibana](./kibana.md) &gt; [UiSettingsClient](./kibana.uisettingsclient.md) &gt; [remove](./kibana.uisettingsclient.remove.md)

## UiSettingsClient.remove() method

Removes the user-defined value for a setting, causing it to revert to the default. This method behaves the same as calling `set(key, null)`<!-- -->, including the synchronization, custom setting, and error behavior of that method.

<b>Signature:</b>

```typescript
remove(key: string): Promise<boolean>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | <code>string</code> |  |

<b>Returns:</b>

`Promise<boolean>`

