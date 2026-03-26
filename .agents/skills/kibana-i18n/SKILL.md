---
name: kibana-i18n
description: Add i18n to Kibana React components and server code using @kbn/i18n and @kbn/i18n-react. Use when internationalizing UI strings, adding FormattedMessage, calling i18n.translate, naming message IDs, or working with Kibana translation files.
---

# Kibana i18n

## Imports

```ts
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
```

Never import from `react-intl` directly.

## API

### `i18n.translate` (non-JSX contexts)

The `id` is a **positional first argument**, not inside the options object:

```ts
i18n.translate('myPlugin.myFeature.saveButtonLabel', {
  defaultMessage: 'Save',
});

i18n.translate('myPlugin.myFeature.greeting', {
  defaultMessage: 'Hello, {name}',
  values: { name: userName },
});
```

### `<FormattedMessage>` (JSX contexts)

Standard react-intl component, re-exported from `@kbn/i18n-react`:

```tsx
<FormattedMessage
  id="myPlugin.myFeature.emptyStateTitle"
  defaultMessage="No results found"
/>

<FormattedMessage
  id="myPlugin.myFeature.resultCountLabel"
  defaultMessage="{count, plural, one {# result} other {# results}}"
  values={{ count: totalResults }}
/>
```

### When to use which

| Context | API |
|---|---|
| JSX return / render | `<FormattedMessage>` |
| Props that accept `string` (aria-label, title, placeholder) | `i18n.translate()` |
| Server-side / non-React code | `i18n.translate()` |
| Hooks, callbacks, event handlers | `i18n.translate()` |

## Message ID Naming

Structure: `{pluginId}.{area}.[{subArea}].{descriptiveName}{TypeSuffix}`

- All segments are **camelCase**, separated by dots.
- Must start with the plugin's namespace (matches `plugin.id` in `kibana.jsonc`).
- Must end with a **type suffix** from the table below.
- Think of IDs as long variable names -- be descriptive, not terse.

### Type Suffixes

| UI Element | Suffix |
|---|---|
| `<h1>`-`<h6>` / page titles | `Title` |
| `<label>` | `Label` |
| `<p>` / prose / descriptions | `Description` |
| `<button>` | `ButtonLabel` |
| dropdown option | `DropDownOptionLabel` |
| `placeholder` attribute | `Placeholder` |
| tooltip | `Tooltip` |
| `aria-label` attribute | `AriaLabel` |
| error message | `ErrorMessage` |
| `<a>` / link text | `LinkText` |
| toggle / switch | `ToggleSwitch` |
| markdown content | `.markdown` |
| inner part of a compound message | `Detail` |

### Examples

```
xpack.security.loginPage.welcomeTitle
xpack.security.loginPage.usernameLabel
xpack.security.loginPage.usernamePlaceholder
xpack.security.loginPage.submitButtonLabel
xpack.security.loginPage.invalidCredentialsErrorMessage
xpack.security.loginPage.forgotPasswordLinkText
xpack.security.management.roles.deleteRoleAriaLabel
xpack.security.management.roles.deleteRoleTooltip
```

Never append progressive numbers (`saveButtonLabel2`) -- choose a more descriptive name instead.

## React Formatting Components

All re-exported from `@kbn/i18n-react`. Import only what you need:

```ts
import {
  FormattedDate,
  FormattedTime,
  FormattedNumber,
  FormattedRelativeTime,
} from '@kbn/i18n-react';
```

### `FormattedDate` + `FormattedTime`

Typically paired together for date+time display:

```tsx
<FormattedDate value={timestamp} year="numeric" month="short" day="2-digit" />
{' '}
<FormattedTime value={timestamp} timeZoneName="short" />
```

Props are standard `Intl.DateTimeFormat` options passed directly (not named presets).

### `FormattedNumber`

Used for locale-aware counts. Often passed as a JSX value inside `FormattedMessage`:

```tsx
<FormattedMessage
  id="myPlugin.agents.selectionLabel"
  defaultMessage="Selected {count} of {total} agents"
  values={{
    count: <FormattedNumber value={selectedCount} />,
    total: <FormattedNumber value={totalAgents} />,
  }}
/>
```

### `FormattedRelativeTime`

Value is in **seconds**. Use `updateIntervalInSeconds` for live countdowns:

```tsx
<FormattedMessage
  id="myPlugin.session.expirationDescription"
  defaultMessage="You will be logged out {timeout}."
  values={{
    timeout: <FormattedRelativeTime value={secondsLeft} updateIntervalInSeconds={1} />,
  }}
/>
```

### `FormattedPlural`

Not used in the codebase. Use ICU `{count, plural, ...}` in `defaultMessage` instead.

## ICU Formatters in `defaultMessage`

### Plurals

Use `#` as the numeric placeholder:

```ts
i18n.translate('myPlugin.items.countLabel', {
  defaultMessage: '{count, plural, one {# item} other {# items}}',
  values: { count: items.length },
});
```

### Select (enum/boolean branching)

```ts
i18n.translate('myPlugin.details.showFullLabel', {
  defaultMessage: 'Show full {isAlert, select, true {alert} other {event}} details',
  values: { isAlert: String(isAlertDoc) },
});
```

### Inline date/time/number formatting

Kibana registers named format presets usable inside ICU strings:

| Syntax | Output example |
|---|---|
| `{val, date, short}` | `6/20/18` |
| `{val, date, medium}` | `Jun 20, 2018` |
| `{val, date, long}` | `June 20, 2018` |
| `{val, date, full}` | `Wednesday, June 20, 2018` |
| `{val, time, short}` | `6:40 PM` |
| `{val, time, medium}` | `6:40:30 PM` |
| `{val, time, long}` | `6:40:30 PM EST` |
| `{val, number, percent}` | `15%` (from `0.15`) |

```ts
i18n.translate('myPlugin.sale.startsLabel', {
  defaultMessage: 'Sale begins {start, date, medium}',
  values: { start: new Date() },
});

i18n.translate('myPlugin.progress.ratioLabel', {
  defaultMessage: '{ratio, number, percent} complete',
  values: { ratio: 0.85 },
});
```

## Compound Messages (JSX inside translations)

When a translated string contains JSX elements (bold, links, etc.), use the tag interpolation pattern:

```tsx
<FormattedMessage
  id="myPlugin.myFeature.confirmDescription"
  defaultMessage="This will delete {strongCount} and cannot be undone."
  values={{
    strongCount: (
      <strong>
        <FormattedMessage
          id="myPlugin.myFeature.confirmDescription.strongCountDetail"
          defaultMessage="{count, plural, one {# item} other {# items}}"
          values={{ count }}
        />
      </strong>
    ),
  }}
/>
```

Inner IDs follow the pattern: `{parentId}.{variableName}Detail`

## Static Analysis Constraints

The extraction tooling parses AST -- these must be **static literals**:

- `id` -- string literal only (no variables, no template literals)
- `defaultMessage` -- string literal, template literal without expressions, or string concatenation
- `values` keys must match `{placeholders}` in `defaultMessage` exactly

```ts
// WRONG -- dynamic id
i18n.translate(`myPlugin.${key}Label`, { defaultMessage: 'Hello' });

// WRONG -- values/defaultMessage mismatch
i18n.translate('myPlugin.greetingLabel', {
  defaultMessage: 'Hello, {name}',
  values: { userName },  // key must be `name`, not `userName`
});
```

## Splitting Rules

- Never split a single sentence across multiple IDs -- context for translators is lost.
- Never separate sentences that reference each other (e.g. pronouns like "close it").
- For unavoidable large paragraphs, split at logical boundaries where each chunk is self-contained.

## Validation

After adding or modifying i18n strings, run:

```bash
node scripts/i18n_check --ignore-missing
```

## Deprecated Patterns

- `injectI18n` HOC -- use the `i18n.translate()` function or `<FormattedMessage>` instead.
- `intl.formatMessage()` via `useIntl` / injected props -- use `i18n.translate()` directly (no provider dependency needed for imperative calls).
