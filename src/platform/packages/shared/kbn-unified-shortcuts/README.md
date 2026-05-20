# @kbn/unified-shortcuts

Shared primitives for building keyboard shortcut experiences in Kibana.

## Overview

This package contains shared building blocks for keyboard shortcut experiences in Kibana.

Use these primitives when you want shortcut behavior, UI, and accessibility to stay consistent
across apps.

## Components

### `ShortcutsProvider`

Provides shared shortcut coordination state to shortcut primitives rendered beneath it. It must wrap all shortcut components rendered throughout an app, and typically lives high in the app tree at a common ancestor.

#### Usage

```tsx
import { ShortcutsProvider } from '@kbn/unified-shortcuts';

export const MainApp = () => {
  return <ShortcutsProvider>{/* app and shortcut components go here */}</ShortcutsProvider>;
};
```

### `LeaderKeyShortcuts`

Renders a leader-key shortcut overlay and handles the keyboard interaction for one shortcut group.

A leader key shortcut is a two-step keyboard flow:

- press one key to open a shortcut group
- press a second key to choose an action from that group

Examples:

- `t` opens the Tab shortcut group, then `n` creates a new tab
- `v` opens the View shortcut group, then `c` toggles the chart

This solves a different problem than traditional single-key global shortcuts. It makes shortcut
groups discoverable, reduces accidental activation, and avoids burning lots of one-key
combinations across the page.

It provides:

- a visible overlay that appears when the leader key is pressed so users can see the available follow-up keys before choosing one
- keyboard handling for both steps of the sequence: opening the group with the leader key and running the matching action with the follow-up key
- automatic dismissal after a shortcut runs, when `Escape` is pressed, or when the user clicks elsewhere
- coordination across multiple mounted shortcut groups so only one leader-key sequence is active at a time
- guards against triggering while focus is inside editable inputs, textareas, selects, or supported code editors
- built-in screen reader announcements for the leader-key hint and the opened shortcut menu

#### Usage

```tsx
import {
  LeaderKeyShortcuts,
  ShortcutsProvider,
  type LeaderKeyShortcut,
} from '@kbn/unified-shortcuts';

const shortcuts: LeaderKeyShortcut[] = [
  {
    key: 'n',
    label: 'n',
    description: 'New tab',
    onTrigger: () => {
      createTab();
    },
  },
  {
    key: 'x',
    label: 'x',
    description: 'Close tab',
    onTrigger: () => {
      closeTab();
    },
  },
];

export const TabShortcuts = () => {
  return (
    <ShortcutsProvider>
      <LeaderKeyShortcuts leaderKey="t" leaderKeyDescription="Tab" shortcuts={shortcuts} />
    </ShortcutsProvider>
  );
};
```

In that example, the full shortcut for creating a new tab is `t` then `n`.

#### Notes

- Keep the component mounted anywhere in the page or app shell where that shortcut group should be active.
- `leaderKeyDescription` should be a short label such as `Tab` or `View`; it is shown in the overlay and reused in accessibility announcements.
- `description` can be dynamic. For example, a follow-up key can show `Show sidebar` or `Hide sidebar` based on current state.
