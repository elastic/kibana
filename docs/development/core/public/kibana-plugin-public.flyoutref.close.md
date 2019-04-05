[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [FlyoutRef](./kibana-plugin-public.flyoutref.md) &gt; [close](./kibana-plugin-public.flyoutref.close.md)

## FlyoutRef.close() method

Closes the referenced flyout if it's still open which in turn will resolve the `onClose` Promise. If the flyout had already been closed this method does nothing.

<b>Signature:</b>

```typescript
close(): Promise<void>;
```
<b>Returns:</b>

`Promise<void>`

