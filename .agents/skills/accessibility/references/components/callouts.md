# EUI callouts: `EuiCallOut` and `announceOnMount`

**Applies to:** `EuiCallOut`

A callout that **appears conditionally** (validation, async result, toggle, post-submit feedback) is invisible to assistive technology unless you opt into EUI's **live-region** behavior.

## Canonical usage

- **Conditional render** (`condition && <…>`, ternary, branches, early return) → set **`announceOnMount`** so the callout is announced when it mounts.
- **Always-mounted, static callout** → omit **`announceOnMount`**; it does not need a live region.
- **Conditional but must not announce** (rare) → **`announceOnMount={false}`** and document why in the callsite if non-obvious.
- New user-visible strings (`title`, body) → **`i18n.translate`** (see *Localization (i18n)* in **`../shared_principles.md`**).

If **`EuiCallOut`** uses **`{...calloutProps}`** and **`announceOnMount`** is not on the opening tag, merge it at the callsite or in the spread source.

## Examples

**Conditional**

```tsx
{hasError && (
  <EuiCallOut
    announceOnMount
    title={i18n.translate('form.errorTitle', { defaultMessage: 'Error' })}
    color="danger"
  >
    {errorMessage}
  </EuiCallOut>
)}
```

**Explicit opt-out**

```tsx
{decorativeCondition && (
  <EuiCallOut announceOnMount={false} title="…">
    …
  </EuiCallOut>
)}
```

## Common mistakes

```tsx
// WRONG — conditional callout without announceOnMount
{hasError && <EuiCallOut title="Error" color="danger" />}

// RIGHT
{hasError && <EuiCallOut announceOnMount title="Error" color="danger" />}

// WRONG — unnecessary on a static callout
<EuiCallOut announceOnMount title="Note" color="primary" />
```
