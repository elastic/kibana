[Home](./index) &gt; [kibana](./kibana.md) &gt; [FlyoutRef](./kibana.flyoutref.md) &gt; [close](./kibana.flyoutref.close.md)

## FlyoutRef.close() method

Closes the referenced flyout if it's still open which in turn will resolve the `onClose` Promise. If the flyout had already been closed this method does nothing.

<b>Signature:</b>

```typescript
close(): Promise<void>;
```
<b>Returns:</b>

`Promise<void>`

