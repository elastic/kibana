---
navigation_title: "UI Actions"
description: "Triggers and actions that let plugins extend each other's UI at runtime."
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/uiactions-plugin.html
---

# UI Actions [uiactions-plugin]

The UI Actions plugin lets one plugin extend another plugin's UI at runtime.

A **trigger** is a named user intent — clicking a value, opening a panel menu, applying a filter. An **action** is the code that runs in response. Plugins attach actions to triggers they do not own. When more than one compatible action is attached, Kibana shows a context menu.

Built-in trigger IDs live in `src/platform/plugins/shared/ui_actions/common/trigger_ids.ts` (`on_click_value`, `on_open_panel_menu`, and others).

## Execute a trigger

```ts
plugins.uiActions.executeTriggerActions('on_click_value', {
  // context passed to every attached action
});
```

`executeTriggerActions` is available from the plugin **start** contract.

## Register and attach an action

Register actions asynchronously during **setup**. `registerAction` is not on the public setup contract.

```ts
plugins.uiActions.registerActionAsync('DO_SOMETHING', async () => ({
  id: 'DO_SOMETHING',
  isCompatible: async (context) => true,
  execute: async (context) => {
    // Do something.
  },
}));

plugins.uiActions.attachAction('on_click_value', 'DO_SOMETHING');
```

To register and attach in one call:

```ts
plugins.uiActions.addTriggerActionAsync('on_click_value', 'DO_SOMETHING', async () => ({
  id: 'DO_SOMETHING',
  isCompatible: async (context) => true,
  execute: async (context) => {
    // Do something.
  },
}));
```

See [`examples/embeddable_examples`](https://github.com/elastic/kibana/tree/main/examples/embeddable_examples) for a maintained consumer.
