# @kbn/presentation-panel-message

`PanelMessage` is the shared message for dashboard panel states: errors, warnings, and expected states such as "No results found". Use it so every panel state has the same title, body, and action layout.

```tsx
import { PanelMessage } from '@kbn/presentation-panel-message';

<PanelMessage
  severity="error"
  title="Panel query can't run"
  body="The query saved with this panel has an error. Edit the visualization to fix it."
  primaryAction={canEdit ? { label: 'Edit visualization', onClick: onEdit } : undefined}
  onViewDetails={openInInspector}
/>;
```

## Copy rules

- **Title**: what happened, in plain words. Sentence case, no end period, about 5 words.
- **Body**: what to do next. Add why only when the title does not already say it. Two short sentences at most. Pass inline content, not a paragraph element.
- **Primary action**: one button that starts the fix. Only pass it when the user has permission for it.
- **Secondary actions**: rendered as links at the end of the body. Use `onViewDetails` for the standard "View details" link that reveals the raw Elasticsearch error.
- Use "panel" for the panel, and "visualization" only in the edit action. Use "data view" for DSL and "data source" for ES|QL. Never say "Unexpected error" for an expected state.

## Severity

- `error`: the panel is broken and will not recover on its own.
- `warning`: the panel cannot show data right now, but the cause is environmental or temporary.
- `info`: an expected state, not a failure. Info states usually pass their own `icon`.

The default icon for each severity is labelled for screen readers ("Error", "Warning", "Information"). A custom `icon` replaces it, so give that icon an accessible name if it carries meaning, or hide it with `aria-hidden` if it is decorative.

## Actions that navigate

Set `href` on an action so it can be opened in a new tab. The `onClick` handler receives the click event. Prevent its default when you navigate inside Kibana, otherwise the browser also follows the `href` and reloads the page. `getRouterLinkProps` from `@kbn/router-utils` does this, and leaves modified clicks such as Cmd+click to the browser:

```tsx
primaryAction={{
  label: 'Create data view',
  ...getRouterLinkProps({ href, onClick: () => application.navigateToUrl(href) }),
}}
```

## Translations

`PanelMessage` must render inside an `I18nProvider`, which Kibana applications already provide. Links are appended to the body through a translated message, so translators control the spacing and punctuation around them.

## Storybook

```sh
pnpm storybook presentation_panel_message
```

- **All states**: every panel state from the design, in the same order and numbering.
- **Playground**: one message inside a panel-sized frame, with a control for every property and for the panel size.
