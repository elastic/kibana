[Home](./index) &gt; [kibana-plugin-public](./kibana-plugin-public.md) &gt; [FlyoutRef](./kibana-plugin-public.flyoutref.md)

## FlyoutRef class

A FlyoutSession describes the session of one opened flyout panel. It offers methods to close the flyout panel again. If you open a flyout panel you should make sure you call `close()` when it should be closed. Since a flyout could also be closed without calling this method (e.g. because the user closes it), you must listen to the "closed" event on this instance. It will be emitted whenever the flyout will be closed and you should throw away your reference to this instance whenever you receive that event.

<b>Signature:</b>

```typescript
export declare class FlyoutRef 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [onClose$](./kibana-plugin-public.flyoutref.onclose$.md) |  | <code>Observable&lt;void&gt;</code> | An Observable that will emit and complete once this flyout is closed, by the user or by closing it from the outside via valling <code>close()</code>. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [close()](./kibana-plugin-public.flyoutref.close.md) |  | Closes the referenced flyout if it's still open by emiting and completing the <code>onClose()</code> Observable. If the flyout had already been closed this method does nothing. |

