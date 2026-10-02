# Footer

`FlyoutTemplate.Footer` renders a primary and a secondary action, right-aligned inside `EuiFlyoutFooter`, with the secondary action first. With no actions, the footer is not rendered at all. The template does not add a default Cancel button.

```tsx
<FlyoutTemplate.Footer>
  <FlyoutTemplate.Footer.SecondaryAction label="Discard" onClick={onDiscard} />
  <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={onSave} />
</FlyoutTemplate.Footer>
```

- `FlyoutTemplate.Footer.PrimaryAction` — rendered as a filled `EuiButton`.
- `FlyoutTemplate.Footer.SecondaryAction` — rendered as an `EuiButtonEmpty`.
- `FlyoutTemplate.Footer.PrimaryActionMenu` — rendered as a filled `EuiButton` that opens an `EuiContextMenu` in a popover above the footer. See [Primary action menu](#primary-action-menu) below.

Only the first instance of each action renders. For `PrimaryActionMenu`, the first instance that has panels wins. Use either `PrimaryAction` or `PrimaryActionMenu`, not both. A `PrimaryActionMenu` with an empty `panels` array counts as absent, so a footer whose only action is an empty menu is not rendered, and nothing warns.

All three `label` props are `string`, not `ReactNode`.

## Actions

`PrimaryAction` and `SecondaryAction` accept `label`, `onClick`, an optional `id`, any `data-*` attributes, and the remaining `EuiButton` props, such as `iconType`, `iconSide`, `isLoading`, `isDisabled`, `contentProps`, and `textProps`. The `id` is forwarded to the button element.

Both are typed from EUI's button-only props, so an action always renders a button and cannot take anchor props. The template controls appearance and sizing, so `children`, `color`, `element`, `fill`, `fullWidth`, `size`, and `buttonRef` are not accepted, and `SecondaryAction` does not take `flush`. `PrimaryAction` also takes `minWidth`, which `EuiButtonEmpty` does not support.

An optional `tooltip` wraps the button in an `EuiToolTip`, for example to explain why the button is disabled. A natively disabled button fires no pointer events, so its tooltip could never open. For that reason, a disabled action with a tooltip sets `hasAriaDisabled` to true by default.

## Primary action menu

```tsx
import type { FlyoutFooterMenuPanel } from '@kbn/flyout-template';

const panels: FlyoutFooterMenuPanel[] = useMemo(() => [
  {
    id: 0,
    items: [
      { name: 'Edit', icon: 'pencil', onClick: onEdit },
      { name: 'Delete', icon: 'trash', onClick: onDelete },
    ],
  },
], [onEdit, onDelete]);

<FlyoutTemplate.Footer>
  <FlyoutTemplate.Footer.SecondaryAction label="Cancel" onClick={onCancel} />
  <FlyoutTemplate.Footer.PrimaryActionMenu label="Take action" panels={panels} />
</FlyoutTemplate.Footer>
```

`panels` uses EUI's own panel descriptors, with these restrictions:

- Panel `content` and item `renderItem` are not supported. Both are typed `?: never`, so they fail type checking.
- `items` is required. Without `content`, a panel with no items is always a mistake.
- Panel `title` and item `name` are `string`, not `ReactNode`. Type the array as `FlyoutFooterMenuPanel[]`. EUI's own type skips these restrictions.
- A nested panel (one opened from another panel's item) must have a `title`, because EUI uses it for the back button. The template warns in development about any nested panel without one.

Behavior:

- The menu always opens upward, aligned with the button's right edge (`anchorPosition="upRight"`). This suits the footer's position and is not configurable.
- Picking an item closes the menu. Set `closeOnItemClick={false}` to keep it open. Items that open a nested panel (`item.panel`) and separators never close the menu.
- After each close, the menu reopens on its initial panel. That panel is `panels[0].id` unless you pass `initialPanelId`.
- The behavioral `EuiContextMenu` props are forwarded: `initialPanelId`, `onPanelChange`, and `height`. The styling props (`className`, `css`, `panelPaddingSize`, `anchorPosition`) are not.
- **Memoize `panels`.** `EuiContextMenu` rebuilds its keyboard-navigation map whenever it receives a new `panels` array. Passing a new array on every render resets arrow-key focus while the menu is open.

| Prop | Type | Notes |
| --- | --- | --- |
| `label` | `string` | Trigger button label. The template adds the chevron. |
| `panels` | `FlyoutFooterMenuPanel[]` | Menu contents. |
| `initialPanelId` | `string \| number` | Defaults to `panels[0].id`. |
| `onPanelChange` | `EuiContextMenuProps['onPanelChange']` | Forwarded unchanged. |
| `height` | `CSSProperties['height']` | Fixed menu height with internal scrolling. |
| `closeOnItemClick` | `boolean` | Defaults to `true`. |
| `id` | `string` | Forwarded to the trigger button. |
| `aria-label` | `string` | Replaces the popover dialog's default name (`"{label} menu"`). |
| `data-test-subj` | `string` | Forwarded to the trigger. The popover panel gets `${value}Panel`. |
| everything else on `EuiButton` | — | Forwarded to the trigger, e.g. `isLoading`, `isDisabled`, `className`, `css`, and any `data-*` attribute. |

The template sets these trigger props itself, so passing them is a type error rather than being silently ignored:

- `children`, `fill`, `iconType`, `iconSide`, `element`, `aria-haspopup`, and the click handler.
- `color` and `size`, so all footer actions look the same.
- `isSelected`, because it sets `aria-pressed`, which is for toggle buttons. A popover trigger uses `aria-expanded`, which EUI already sets.
- `type`, which is always `"button"`, so a trigger inside a `<form>` opens the menu without submitting the form.
