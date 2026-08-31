# deepagent Knowledge Base: React & UI Patterns

## Overview

React and UI patterns account for approximately 3% of deepagent's feedback (~15+ items across ~400 PRs). While not his primary focus, he has clear expectations around performance, component architecture, and i18n compliance in React code.

---

## Performance

### useMemo for Derived Values

**PR #226602 - useMemo for derived values (WARNING)**

Any value computed from props or state that involves non-trivial work (array operations, object transformations, filtering, sorting) should be wrapped in `useMemo`.

```typescript
// BAD - runs on every render
function ToolList({ tools, selectedCategory }: Props) {
  const filteredTools = tools.filter(t => t.category === selectedCategory);
  const sortedTools = filteredTools.sort((a, b) => a.name.localeCompare(b.name));
  return <List items={sortedTools} />;
}

// GOOD - only recomputes when dependencies change
function ToolList({ tools, selectedCategory }: Props) {
  const filteredTools = useMemo(
    () => tools.filter(t => t.category === selectedCategory),
    [tools, selectedCategory]
  );
  const sortedTools = useMemo(
    () => [...filteredTools].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredTools]
  );
  return <List items={sortedTools} />;
}
```

### Move Static Values Outside Components

**PR #229042 - Move labels outside components (WARNING)**

Static values that don't depend on props or state should be defined outside the component function body. This includes i18n labels, constant configurations, and style objects.

```typescript
// BAD - recreated on every render
function ToolPanel() {
  const labels = {
    title: i18n.translate('tool.title', { defaultMessage: 'Tools' }),
    description: i18n.translate('tool.desc', { defaultMessage: 'Available tools' }),
  };
  return <Panel title={labels.title} description={labels.description} />;
}

// GOOD - created once at module level
const labels = {
  title: i18n.translate('tool.title', { defaultMessage: 'Tools' }),
  description: i18n.translate('tool.desc', { defaultMessage: 'Available tools' }),
};

function ToolPanel() {
  return <Panel title={labels.title} description={labels.description} />;
}
```

### Avoid Array.find/filter Without Memo

**PR #236410 - Array.find without memo (WARNING)**

Array search operations in render are particularly expensive when:
- The array is large
- The operation happens in a frequently re-rendered component
- The result is used as a dependency for other hooks

```typescript
// BAD - find runs on every render
function ToolDetail({ tools, selectedId }: Props) {
  const selectedTool = tools.find(t => t.id === selectedId);
  if (!selectedTool) return null;
  return <ToolView tool={selectedTool} />;
}

// GOOD - find runs only when dependencies change
function ToolDetail({ tools, selectedId }: Props) {
  const selectedTool = useMemo(
    () => tools.find(t => t.id === selectedId),
    [tools, selectedId]
  );
  if (!selectedTool) return null;
  return <ToolView tool={selectedTool} />;
}
```

---

## Component Architecture

### Presentational Components Receive Data via Props

**PR #226486 - Presentational components receiving data via props (WARNING)**

Components that render UI should receive their data through props, not by reaching into global state, services, or context directly. This separation makes components:
- Testable (pass mock data as props)
- Reusable (not coupled to a specific data source)
- Predictable (output depends only on input)

```typescript
// BAD - component reaches into service directly
function ToolList() {
  const tools = useToolService().getTools(); // Coupled to service
  return <ul>{tools.map(t => <li key={t.id}>{t.name}</li>)}</ul>;
}

// GOOD - data passed via props
interface ToolListProps {
  tools: Tool[];
}

function ToolList({ tools }: ToolListProps) {
  return <ul>{tools.map(t => <li key={t.id}>{t.name}</li>)}</ul>;
}

// Container component handles data fetching
function ToolListContainer() {
  const tools = useToolService().getTools();
  return <ToolList tools={tools} />;
}
```

### Functional Components with Explicit Props

All new components should be functional components with explicitly typed props:

```typescript
// GOOD
interface ToolCardProps {
  tool: Tool;
  onSelect: (toolId: string) => void;
  isSelected: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onSelect, isSelected }) => {
  return (
    <EuiCard
      title={tool.name}
      description={tool.description}
      onClick={() => onSelect(tool.id)}
      selectable={{ isSelected }}
    />
  );
};
```

### Hooks at Top Level

React hooks must be called at the top level of the component, not inside conditions, loops, or nested functions:

```typescript
// BAD - conditional hook
function ToolPanel({ showAdvanced }: Props) {
  if (showAdvanced) {
    const advancedTools = useAdvancedTools(); // WRONG
  }
}

// GOOD - always call hook, conditionally use result
function ToolPanel({ showAdvanced }: Props) {
  const advancedTools = useAdvancedTools();
  return (
    <div>
      {showAdvanced && <AdvancedToolList tools={advancedTools} />}
    </div>
  );
}
```

---

## i18n in React Components

### FormattedMessage with values Prop

**PR #234670 - FormattedMessage with values prop (BLOCKER)**

When rendering translated strings with dynamic values in JSX, use `<FormattedMessage>` with the `values` prop:

```tsx
// BAD - BLOCKER: string interpolation in defaultMessage
<FormattedMessage
  id="tool.count"
  defaultMessage={`Found ${count} tools`}
/>

// BAD - BLOCKER: concatenation
<>
  <FormattedMessage id="tool.found" defaultMessage="Found" />
  {' '}{count}{' '}
  <FormattedMessage id="tool.tools" defaultMessage="tools" />
</>

// GOOD
<FormattedMessage
  id="tool.count"
  defaultMessage="Found {count} tools"
  values={{ count }}
/>
```

### Never Split Translated Strings

**PR #235117 - Never split translated strings (BLOCKER)**

See `i18n_guidelines.md` for the full rule. In React context, this means:
- One `<FormattedMessage>` per complete sentence
- Use `values` prop for all dynamic parts
- Never concatenate translated fragments

### Labels Outside Component Bodies

Already covered in the performance section. Static i18n labels should be defined at module level, not inside component functions.

---

## EUI Components

### Use EUI for Consistent UI

Kibana uses the Elastic UI (EUI) component library. New components should use EUI components rather than raw HTML elements for:
- Consistent styling across Kibana
- Built-in accessibility support
- Theme compatibility
- Responsive behavior

```typescript
// BAD
<button onClick={handleClick} className="my-button">
  Click me
</button>

// GOOD
<EuiButton onClick={handleClick}>
  Click me
</EuiButton>
```

### Emotion for Styling

Use Emotion (`@emotion/react`) for custom styling, consistent with Kibana conventions:

```typescript
import { css } from '@emotion/react';

const toolCardStyle = css`
  padding: 16px;
  border-radius: 4px;
`;

function ToolCard() {
  return <div css={toolCardStyle}>...</div>;
}
```

---

## Common Anti-patterns

### 1. Unmemoized Derived Values
Already covered. Use `useMemo`.

### 2. Labels Inside Components
Already covered. Move to module level.

### 3. Split Translated Strings
Already covered. Use single `FormattedMessage` with `values`.

### 4. Inline Styles Over Emotion
```typescript
// BAD
<div style={{ padding: 16, borderRadius: 4 }}>

// GOOD
<div css={css`padding: 16px; border-radius: 4px;`}>
```

### 5. Direct Service Access in Presentational Components
Already covered. Pass data via props.

---

## Summary of Severity

| Issue | Severity |
|-------|----------|
| Split translated strings in JSX | BLOCKER |
| FormattedMessage without values prop | BLOCKER |
| Missing useMemo for derived values | WARNING |
| Labels defined inside component | WARNING |
| Array.find/filter without memo | WARNING |
| Component reaching into services directly | WARNING |
| Conditional hooks | WARNING |
| Raw HTML instead of EUI | NIT |
| Inline styles instead of Emotion | NIT |
