---
name: enzyme-to-rtl
description: Migrate Enzyme tests to React Testing Library (RTL). Use when converting shallow/mount enzyme tests to RTL render, replacing enzyme selectors with RTL queries, updating snapshot tests, or when the user mentions enzyme migration, RTL migration, or react-testing-library.
disable-model-invocation: true
---

# Enzyme to React Testing Library Migration

## Goal

Migrate enzyme tests to `@testing-library/react` as a 1:1 port — preserve existing test intent without refactoring toward integration-style testing or removing mocks.

## Core principles

- **Preserve test intent.** Do not rewrite test logic or remove mocks. Add mocks where enzyme's shallow rendering previously hid missing providers/contexts.
- **Cut dead tests.** Enzyme tests component trees, not DOM. Tests that assert on elements never actually rendered in the DOM should be removed with a comment explaining why.
- **No new `data-test-subj` for snapshots.** Use `container.children[0]` for root-element snapshots instead of adding a test locator just for snapshotting.

## Migration workflow

1. Replace enzyme imports with RTL imports.
2. Replace `shallow()` / `mount()` with `render()`.
3. Migrate selectors and assertions.
4. Update or delete snapshots (`--updateSnapshot`).
5. Run the test and fix any missing mocks/providers that enzyme's shallow rendering was hiding.

## Import changes

### Before

```typescript
import { shallow, mount } from 'enzyme';
import { shallowWithIntl, mountWithIntl, findTestSubject } from '@kbn/test-jest-helpers';
```

### After

```typescript
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
```

Keep `@kbn/test-jest-helpers` only for non-enzyme utilities (e.g. `nextTick`, `StubBrowserStorage`) and RTL render helpers (`renderWithKibanaRenderContext`, `renderWithI18n`, `renderWithEuiTheme`). Remove `findTestSubject` — use `screen.getByTestId` instead.

When the component needs i18n or EUI theme context, prefer the RTL helpers from `@kbn/test-jest-helpers` instead of manually wrapping in providers:

| Helper | Wraps with |
|---|---|
| `renderWithKibanaRenderContext(<Comp />)` | `EuiThemeProvider` + `I18nProvider` — **preferred default** for most migrations |
| `renderWithI18n(<Comp />)` | `I18nProvider` only |
| `renderWithEuiTheme(<Comp />)` | `EuiThemeProvider` only |

These are drop-in replacements for RTL's `render()` and accept the same arguments (including `renderOptions`). When the component needs additional providers (Redux, Router, custom contexts), add them as a `wrapper` option or inline in JSX.

## Rendering

| Enzyme | RTL |
|---|---|
| `shallow(<Comp />)` | `render(<Comp />)` or `renderWithKibanaRenderContext(<Comp />)` |
| `mount(<Comp />)` | `render(<Comp />)` or `renderWithKibanaRenderContext(<Comp />)` |
| `shallowWithIntl(<Comp />)` | `renderWithI18n(<Comp />)` or `renderWithKibanaRenderContext(<Comp />)` |
| `mountWithIntl(<Comp />)` | `renderWithI18n(<Comp />)` or `renderWithKibanaRenderContext(<Comp />)` |

Use `screen` for queries (queries `document.body`, so portals are reachable too):

```typescript
render(<MyComponent />);
expect(screen.getByTestId('foo')).toBeInTheDocument();
```

## Selector migration

### Test subject selectors

Note: In Kibana Jest setup, RTL uses `testIdAttribute: 'data-test-subj'`, so `getByTestId('x')` queries `data-test-subj="x"` (not `data-testid`).

| Enzyme | RTL |
|---|---|
| `wrapper.find('[data-test-subj="x"]')` | `screen.getByTestId('x')` |
| `findTestSubject(wrapper, 'x')` | `screen.getByTestId('x')` |
| `wrapper.find('[data-test-subj="x"]').exists()` | `screen.queryByTestId('x')` (returns `null` if absent) |
| Nested: `wrapper.find('[data-test-subj="a"] [data-test-subj="b"]')` | `within(screen.getByTestId('a')).getByTestId('b')` |

Make sure `findTestSubject` matcher behavior is preserved with a `getByTestId` `RegExp` matcher when `data-test-subj` contains multiple tokens.

After interactions that trigger async updates, prefer `findByTestId` over `getByTestId` to avoid `act()` warnings from unresolved updates.

Kibana-specific fallback: `subj()` from `@kbn/test-subj-selector` converts test-subject selector syntax to a CSS selector (supports `~`/`*`/`>`). Prefer RTL queries first; use this when you truly need CSS selection:

```typescript
import { subj } from '@kbn/test-subj-selector';

const el = container.querySelector(subj('foo > ~bar'));
```

Note: Some EUI components reuse the same `data-test-subj` on both a wrapper and the actual control. If `getByTestId` throws “Found multiple elements”, use `getAllByTestId`/`queryAllByTestId` and narrow (or scope with `within(...)`) instead of switching to brittle CSS selectors.

### CSS selectors

| Enzyme | RTL |
|---|---|
| `wrapper.find('.my-class')` | `container.querySelector('.my-class')` |
| `wrapper.find('button')` | `container.querySelector('button')` or `screen.getByRole('button')` |
| `wrapper.findAll('.item')` | `container.querySelectorAll('.item')` |

### Complex traversals

Enzyme chains like `wrapper.find('tbody tr td a').at(3).find('div span').at(2).text()` become:

```typescript
const links = container.querySelectorAll('tbody tr td a');
links[3]?.querySelectorAll('div span')[2]?.textContent;
```

### Global selectors (modals, popovers)

For elements rendered outside the component's container (portals), prefer `screen` / `within(document.body)`:

```typescript
// Portal content is in document.body, so screen queries can find it
expect(screen.getByTestId('modal-confirm')).toBeInTheDocument();

// Or scope explicitly
within(document.body).getByTestId('modal-confirm');
```

### Targeting the last element in a NodeList

```typescript
const items = container.querySelectorAll('.item');
expect(Array.from(items).at(-1)).toHaveTextContent('last');
```

## Assertion migration

| Enzyme | RTL |
|---|---|
| `expect(wrapper).toMatchSnapshot()` | `expect(container.children[0]).toMatchSnapshot()` |
| `wrapper.text()` | `screen.getByText('...')` or `element.textContent` |
| `wrapper.find(X).exists()` | If `X` is a test subject: `screen.queryByTestId('x') !== null`. If `X` is a CSS selector string: `container.querySelector(X) !== null`. If `X` is a React component (e.g. `wrapper.find(EuiCallOut)`), assert on DOM output (role/text/test subject) instead of component selectors. |
| `wrapper.find(X).length` | If `X` is a CSS selector string: `container.querySelectorAll(X).length`. If `X` is a React component (e.g. `wrapper.find(EuiCallOut)`), assert on DOM output (role/text/test subject) instead of component selectors. |
| `wrapper.find(X).prop('foo')` | See "Testing component props" below |
| `wrapper.find(X).props()` | See "Testing component props" below |
| `wrapper.find(X).simulate('click')` | `fireEvent.click(element)` |
| `wrapper.find('input').simulate('change', { target: { value: 'x' } })` | `fireEvent.change(input, { target: { value: 'x' } })` and `fireEvent.blur(input)` when validation is blur-driven. Use `userEvent.type` only when per-keystroke behavior matters. |
| `wrapper.update()` | Not needed — RTL re-queries the DOM automatically. Wrap state updates in `act()` if needed. |
| `wrapper.setProps({ foo: 'bar' })` | Re-render: `rerender(<Comp foo="bar" />)` |

## Testing component props (mock-based pattern)

When tests assert on props passed to child components, mock the child and inspect mock calls:

```typescript
jest.mock('@elastic/charts', () => {
  const actual = jest.requireActual('@elastic/charts');
  return {
    ...actual,
    AreaSeries: jest.fn(() => <div data-test-subj="area-series-mock" />),
    Axis: jest.fn(() => <div data-test-subj="axis-mock" />),
  };
});

const MockedAreaSeries = jest.mocked(AreaSeries);
const MockedAxis = jest.mocked(Axis);

it('passes yScaleType to AreaSeries', () => {
  render(<MyChart {...defaultProps} />);
  expect(MockedAreaSeries.mock.calls[0][0].yScaleType).toEqual(configs.series.yScaleType);
});

it('passes tickFormat to xAxis', () => {
  render(<MyChart {...defaultProps} />);
  expect(MockedAxis).toHaveBeenCalledWith(
    expect.objectContaining({ tickFormat: mockTimeFormatter }),
    expect.anything()
  );
});
```

Use this pattern instead of enzyme's `.find(Component).prop('propName')`. Clear mocks between tests with `jest.clearAllMocks()` in `beforeEach`.

## Async & state updates

- Wait for a UI boundary with `findBy*` (preferred) or `waitFor()` when you need a custom assertion. Use `act()` for explicit timer advancement/flush (e.g. `jest.runOnlyPendingTimersAsync()` in fake-timer suites) or imperative callbacks that trigger React updates.

- Replace `wrapper.update()` + `nextTick()` patterns with `await waitFor(...)`.
- For promises that resolve in tests, prefer `findByTestId` (auto-waits) over `getByTestId` + `waitFor`. Prefer reusing the element returned from `findBy*` instead of re-querying with `getBy*` immediately after (re-query only when you expect the DOM to change/replace the element).
- For elements that should disappear, prefer `waitForElementToBeRemoved(...)` (example: `await waitForElementToBeRemoved(screen.getByTestId('loading'))`).
- Don't wrap `fireEvent`/`userEvent` in `act()`; instead, perform the interaction and then wait on the relevant UI boundary (see bullets above).
- Avoid “fixing” failures by increasing `waitFor` timeouts; tighten the UI boundary you wait for instead.

## Snapshot strategy

- `shallow` + `toMatchSnapshot()` → `render()` + `expect(container.children[0]).toMatchSnapshot()`.
- Snapshots will be larger since RTL renders full DOM. This is expected — do not add mocks just to shrink snapshots during this migration.
- Delete old `.snap` files and regenerate: `yarn test:jest --updateSnapshot <path>`.
- **Default to `container.children[0]` snapshots.** When the snapshot is too large or noisy, fall back to targeted assertions instead:

```typescript
expect(screen.getByTestId('chart-title')).toHaveTextContent('Revenue');
expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
expect(screen.queryByTestId('error-banner')).not.toBeInTheDocument();
```

- **Portal-based components (popovers, modals, tooltips, toasts) must use targeted assertions, not snapshots.** Their panel content renders outside `container` via portals, so `container.children[0]` only captures the trigger/anchor — not the actual content. Use `screen` queries (which search the full document body) or `document.querySelector` for portals:

```typescript
// Popover: render with isOpen, assert on panel content via screen
render(
  <MyPopover isOpen button={<button>Toggle</button>}>
    <SelectableList options={options} />
  </MyPopover>
);
expect(screen.getByText('Toggle')).toBeInTheDocument();
expect(screen.getByText('Panel Title')).toBeInTheDocument();
expect(screen.getByText('Option A')).toBeInTheDocument();
expect(document.querySelector('[id^="searchInput"]')).toBeInTheDocument();

// Modal: content renders in a portal, use document.querySelector
expect(document.querySelector('[data-test-subj="confirmModal"]')).toBeInTheDocument();

// Tooltip: content only appears on hover
await userEvent.hover(screen.getByText('Hover me'));
await waitFor(() => {
  expect(screen.getByRole('tooltip')).toHaveTextContent('Tooltip text');
});
```

## Common pitfalls

- **Missing providers after removing shallow.** Enzyme `shallow` doesn't render children deeply, hiding missing context providers. After switching to `render()`, add required providers (I18n, Redux, Router, Theme, etc.) or mock them.
- **EUI component explosions.** Some EUI components render complex DOM. Mock them if the test doesn't care about their internals. Prefer shared mocks when available (e.g. `import "@kbn/code-editor-mock/jest_helper"`), then plugin-local `__mocks__/` files (e.g. `<pluginRoot>/__mocks__/@elastic/charts/index.tsx`), then an inline mock factory as a fallback. When stubbing components to `<div>`s, add a `data-test-subj` only when the test needs a stable query for "mock rendered".
- **Portal-based elements.** Modals, toasts, and popovers render outside `container`. Use `document.querySelector` or `screen` (which queries the whole document body). Never snapshot these — use targeted assertions instead (see Snapshot strategy).
- **`act()` warnings.** Usually caused by missing `await` / missing async UI boundary after an interaction. Prefer `await screen.findBy...` / `await waitFor(...)` over wrapping events in `act()` (events are already wrapped). Use `act()` for explicit timer advancement/flush (e.g. `jest.runOnlyPendingTimersAsync()` in fake-timer suites) or imperative callbacks that trigger React updates. Never use empty `act()` blocks (e.g. `await act(async () => {})`).
- **`userEvent` performance.** `userEvent` simulates full event sequences and scales poorly in CI (geometrically with interaction count). Prefer `fireEvent` for simple clicks and value changes. Replace `userEvent.type(input, 'text')` with `fireEvent.change(input, { target: { value: 'text' } })` + `fireEvent.blur(input)` unless the test is specifically exercising per-keystroke behavior (e.g. keydown handlers, typeahead suggestions, input masking/formatting, debounce-on-each-char). When `fireEvent.change` causes act warnings inside portals/overlays, prefer `userEvent.paste` over `userEvent.type` — it sets the full value in one step without per-character overhead.
- **Timer-based tests.** Replace `jest.advanceTimersByTime` patterns carefully — RTL's `userEvent` uses real timers by default. Use `userEvent.setup({ advanceTimers: jest.advanceTimersByTime })` when fake timers are needed.

## Running tests

```bash
yarn test:jest <path-to-test-file> --updateSnapshot
```

## Checklist

- [ ] All `enzyme` imports removed
- [ ] All `shallow()` / `mount()` replaced with `render()`
- [ ] `shallowWithIntl` / `mountWithIntl` replaced with `render()` + `I18nProvider` wrapper
- [ ] `findTestSubject` replaced with equivalent selector semantics (exact vs token `~=` match)
- [ ] Selectors migrated to RTL queries or `container.querySelector`
- [ ] `.simulate()` replaced with `userEvent` or `fireEvent`
- [ ] `.prop()` / `.props()` replaced with mock-based pattern
- [ ] Snapshots regenerated
- [ ] Dead tests (passing only due to shallow rendering) removed
- [ ] Test passes: `yarn test:jest <path>`

## References

- [Migrate from Enzyme | Testing Library](https://testing-library.com/docs/react-testing-library/migrate-from-enzyme/)
