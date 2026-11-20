# Clickable cards: one action per card

**Applies to:** `EuiCard`

An `EuiCard` with `href` or `onClick` renders itself as a single interactive control — the title becomes a link/button and the whole card forwards clicks to it. Any other interactive element in the card's content (most commonly a button in `footer`, but also `title`, `description`, or `image`) ends up nested inside that same click-forwarding region: invalid HTML, and a second, confusing focus stop for keyboard/screen-reader users. This is reported by `@elastic/eui/no-nested-interactive-element` (`clickableCardContent`).

**The rule cannot see through a spread.** It only recognizes a literal `href={...}` / `onClick={...}` attribute written directly on `<EuiCard>`. `<EuiCard {...cardRest} footer={<EuiButton>…</EuiButton>} />` with `href`/`onClick` hidden inside `cardRest` produces the exact same invalid markup but passes lint cleanly. Always check for this shape by hand when a card spreads unknown props and also renders a button/link in its content — do not trust a clean lint run alone (see *When to escalate → Spread props hide wiring* in `../shared_principles.md`).

## Canonical usage

Pick **one** control for the card's action and make everything else inert:

1. **A real, wired button/link exists in the content (usually `footer`).** Move `href`, `onClick`, and `isDisabled` from the card onto that control; do not set them on `EuiCard` itself.
2. **No interactive content inside the card.** Keep `href`/`onClick` on `EuiCard` — a clickable card with only text/image content is explicitly valid and not reported.
3. **Selecting and acting are genuinely two different actions** (e.g. a checkbox-style select plus a separate "Details" action). Use `EuiCard`'s `selectable` prop for the select action and keep the second action as a real control in `footer`. This is EUI's own supported pairing and is not reported, but it's only safe when the footer control stops click propagation — the rule cannot verify that statically, so confirm it by reading the control's handler before relying on this pattern.

4. **A badge (status, beta, deprecated) with a tooltip.** Use `EuiCard`'s `betaBadgeProps` (`label`, `tooltipContent`, `color`) instead of placing an `EuiBetaBadge`/`EuiIconTip` in `title`/`description`. This is the pattern EUI documents for badging a clickable card: the card wires the badge into the title control's `aria-describedby`, and the tooltip stays reachable by keyboard. Put any extra explanatory text in the same `tooltipContent` rather than adding an `EuiIconTip` next to it. The rule does not analyse `betaBadgeProps`, so it is never reported.

## Examples

```tsx
// RIGHT — the button is the single control; the card has no href/onClick
const footer = (
  <EuiButton fill href={href} onClick={onClick} isDisabled={isDisabled}>
    {label}
  </EuiButton>
);
<EuiCard title={title} description={description} footer={footer} />;

// RIGHT — no interactive content, so the card itself can be the control
<EuiCard title={title} description={description} href={href} />;

// RIGHT — EUI's selectable + footer-action pairing (verify the footer control
// stops propagation before using this)
<EuiCard
  title={title}
  description={description}
  selectable={{ onClick: onSelect }}
  footer={<EuiButtonEmpty onClick={onDetails}>Details</EuiButtonEmpty>}
/>;

// RIGHT — badge with a tooltip on a clickable card: use betaBadgeProps
<EuiCard
  title={title}
  description={description}
  onClick={onClick}
  betaBadgeProps={{ label: deprecatedLabel, color: 'warning', tooltipContent: deprecatedTooltip }}
/>;
```

## Common mistakes

```tsx
// WRONG — card has href, footer has its own unwired button: invalid nesting
<EuiCard title={title} href={href} footer={<EuiButton fill>{label}</EuiButton>} />;

// WRONG — tooltip badge hand-placed in the content of a clickable card
<EuiCard
  title={title}
  onClick={onClick}
  description={<EuiBetaBadge label={deprecatedLabel} tooltipContent={deprecatedTooltip} />}
/>;

// WRONG — same bug, hidden from the lint rule because href arrives via the spread
const footer = <EuiButton fill>{label}</EuiButton>;
<EuiCard title={title} footer={footer} {...cardRest} />; // cardRest contains href
```
