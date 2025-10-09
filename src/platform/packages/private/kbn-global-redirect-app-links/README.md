# @kbn/global-redirect-app-links

Global click delegation for single-page Kibana navigation. Supposed to be used only once by Kibana Root (by core).

## What it does

Intercepts clicks on `<a>` tags and routes them through Kibana's navigation system instead of performing full page reloads. This enables seamless SPA navigation while preserving native link behavior.
Event listener is attached to the document and uses event delegation to handle clicks on any `<a>` tags.

## Usage

In core rendering service:

```tsx
import { GlobalRedirectAppLink } from '@kbn/global-redirect-app-links';

ReactDOM.render(
  <>
    <GlobalRedirectAppLink navigateToUrl={coreStart.application.navigateToUrl} />
    <RestOfKibana />
  </>
);
```

## Behavior

**Intercepts clicks when:**

- Left-click (button 0)
- No modifier keys (Cmd/Ctrl/Alt/Shift)
- Target is `_self` or not specified
- Not marked with `data-kbn-redirect-app-link-ignore`
- Not a download link or external link (`rel="external"`)

**Ignores clicks when:**

- Right/middle-click
- Modifier key pressed (opens in new tab/window)
- Target is `_blank`, `_parent`, etc.
- Link has `download` attribute
- Link has `rel="external"`
- Link has `data-kbn-redirect-app-link-ignore` attribute
