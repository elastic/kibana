# Screenshot Mode

The service exposed by this plugin informs consumers whether they should optimize for non-interactivity. In this way plugins can avoid loading unnecessary code, data or other services.

The primary intention is to inform other lower-level plugins (plugins that don't depend on other plugins) that we do not expect an actual user to interact with browser. In this way we can avoid loading unnecessary resources (code and data).

**NB** This plugin should have no other dependencies to avoid any possibility of circular dependencies.

---

## Development

### How to test in screenshot mode

Please note: the following information is subject to change over time.

In order to test whether we are correctly detecting screenshot mode, developers can run the following JS snippet:

```js
window.localStorage.setItem('__KBN_SCREENSHOT_MODE_ENABLED_KEY__', true);
```

To get out of screenshot mode, run the following snippet:

```js
window.localStorage.removeItem('__KBN_SCREENSHOT_MODE_ENABLED_KEY__');
```
