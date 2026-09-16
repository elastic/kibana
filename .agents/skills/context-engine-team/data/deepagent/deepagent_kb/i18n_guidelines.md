# deepagent Knowledge Base: i18n Guidelines

## Overview

Internationalization (i18n) accounts for approximately 3% of deepagent's feedback (~15+ items across ~400 PRs). Despite the relatively low volume, i18n issues are disproportionately likely to be blockers. deepagent treats i18n compliance as a hard requirement, not a nice-to-have.

---

## Core Rules

### Rule 1: Never Split Translated Strings (BLOCKER)

**PR #235117 - Never split translated strings (BLOCKER)**

This is the most critical i18n rule. Translated strings must be complete, self-contained units. Never construct translated text by concatenating fragments.

**Why:**
- Different languages have different word orders (English: "5 results found", Japanese: "5件の結果が見つかりました")
- Translators need to see the full sentence to produce correct grammar
- Gender, plurality, and case rules vary by language and apply to the whole sentence
- Fragments may not combine grammatically in other languages

```typescript
// BAD - BLOCKER: concatenating fragments
const msg = i18n.translate('app.found', { defaultMessage: 'Found' })
  + ' ' + count + ' '
  + i18n.translate('app.results', { defaultMessage: 'results' });

// BAD - BLOCKER: template literal with embedded translations
const msg = `${i18n.translate('app.found', { defaultMessage: 'Found' })} ${count}`;

// BAD - BLOCKER: array join with translations
const parts = [
  i18n.translate('app.showing', { defaultMessage: 'Showing' }),
  String(count),
  i18n.translate('app.of', { defaultMessage: 'of' }),
  String(total),
];
const msg = parts.join(' ');
```

```typescript
// GOOD: single translation with interpolation
const msg = i18n.translate('app.resultCount', {
  defaultMessage: 'Found {count} results',
  values: { count },
});

// GOOD: with multiple variables
const msg = i18n.translate('app.showingOfTotal', {
  defaultMessage: 'Showing {count} of {total} results',
  values: { count, total },
});
```

### Rule 2: FormattedMessage with values Prop (BLOCKER)

**PR #234670 - FormattedMessage with values prop for dynamic parts (BLOCKER)**

In React/JSX, use `<FormattedMessage>` with the `values` prop for dynamic content. Never use string interpolation or concatenation in the `defaultMessage`.

```tsx
// BAD - BLOCKER: string interpolation
<FormattedMessage
  id="app.greeting"
  defaultMessage={`Hello, ${userName}!`}
/>

// BAD - BLOCKER: fragment concatenation
<>
  <FormattedMessage id="app.hello" defaultMessage="Hello, " />
  {userName}
  <FormattedMessage id="app.exclaim" defaultMessage="!" />
</>

// BAD - BLOCKER: conditional fragment
<FormattedMessage
  id="app.status"
  defaultMessage={isActive ? 'Active' : 'Inactive'}
/>
```

```tsx
// GOOD: values prop
<FormattedMessage
  id="app.greeting"
  defaultMessage="Hello, {userName}!"
  values={{ userName }}
/>

// GOOD: with JSX in values
<FormattedMessage
  id="app.greeting"
  defaultMessage="Hello, {userName}!"
  values={{
    userName: <strong>{userName}</strong>,
  }}
/>

// GOOD: conditional via separate IDs
{isActive ? (
  <FormattedMessage id="app.status.active" defaultMessage="Active" />
) : (
  <FormattedMessage id="app.status.inactive" defaultMessage="Inactive" />
)}
```

### Rule 3: Labels Outside Component Bodies (WARNING)

**PR #229042 - Move labels outside components to avoid recomputation (WARNING)**

Static i18n labels should be defined outside the component function body. Inside the component, they are re-evaluated on every render, which is unnecessary for static content.

```typescript
// BAD - re-evaluated on every render
function ToolPanel() {
  const title = i18n.translate('tool.title', { defaultMessage: 'Tools' });
  return <h1>{title}</h1>;
}

// GOOD - evaluated once at module load
const TITLE = i18n.translate('tool.title', { defaultMessage: 'Tools' });

function ToolPanel() {
  return <h1>{TITLE}</h1>;
}
```

**Exception:** Labels that include dynamic values from props or state must remain inside the component (but should use the `values` prop, not interpolation):

```typescript
function ToolCount({ count }: { count: number }) {
  // This must be inside the component because it depends on props
  const label = i18n.translate('tool.count', {
    defaultMessage: '{count} tools available',
    values: { count },
  });
  return <span>{label}</span>;
}
```

---

## Translation ID Conventions

### Naming Pattern

Translation IDs should follow the pattern: `<plugin>.<component>.<element>`:

```typescript
// GOOD
i18n.translate('agentBuilder.toolPanel.title', { defaultMessage: 'Tools' })
i18n.translate('agentBuilder.toolPanel.createButton', { defaultMessage: 'Create tool' })
i18n.translate('agentBuilder.toolPanel.deleteConfirmation', {
  defaultMessage: 'Are you sure you want to delete {toolName}?',
  values: { toolName },
})
```

### Unique IDs

Every translation must have a unique ID. Reusing IDs across different strings causes translation collisions.

---

## Pluralization

Use ICU message syntax for plural forms:

```typescript
// GOOD
i18n.translate('app.itemCount', {
  defaultMessage: '{count, plural, one {# item} other {# items}}',
  values: { count },
});
```

**Note:** Different languages have different plural rules (e.g., Arabic has six plural forms). ICU syntax handles this automatically.

---

## Common Anti-patterns

### 1. String Concatenation
Already covered. Use `values` prop.

### 2. Template Literals with i18n
Already covered. No interpolation in `defaultMessage`.

### 3. Fragment Concatenation in JSX
Already covered. Use single `FormattedMessage` with `values`.

### 4. Labels Inside Components
Already covered. Define at module level for static labels.

### 5. Hardcoded Strings in UI
All user-facing strings must be translated:

```tsx
// BAD - hardcoded
<EuiButton>Create Tool</EuiButton>

// GOOD - translated
<EuiButton>
  <FormattedMessage id="agentBuilder.createTool" defaultMessage="Create tool" />
</EuiButton>
```

### 6. Using toString() for Display
Never call `toString()` on domain objects for display purposes. Create explicit translated labels.

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| Split translated strings (concatenation) | BLOCKER |
| FormattedMessage without values prop | BLOCKER |
| Template literal in defaultMessage | BLOCKER |
| Fragment concatenation in JSX | BLOCKER |
| Labels defined inside component (static) | WARNING |
| Hardcoded user-facing strings | WARNING |
| Missing pluralization | NIT |
| Non-standard translation ID | NIT |
