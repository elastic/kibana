# Build version panel

Step 5 — when the user has **multiple design iterations** (v1, v2, …) to compare in one running app.

## When to use

- User supplies several Figma frames or screenshots for the same feature
- Design review needs side-by-side or quick toggle between versions
- Skip if only one design is in scope

## Agent flow

1. **Ask** how many versions and labels (e.g. `Current`, `Proposal A`, `Proposal B`).
2. Implement one React component per version under `public/components/versions/`.
3. Add a **switcher** in the app shell (e.g. `EuiTabs`, `EuiButtonGroup`, or `EuiSelect`) — fixed at top of the prototype app, not production chrome.
4. Keep shared layout chrome stable; only swap the version body.
5. Register a single app per [implement](implement.md) (Path A); versions are in-app only.

## Pattern (minimal)

```tsx
// public/application.tsx — illustrative
const VERSIONS = [
  { id: 'v1', label: 'Version 1', Component: Version1 },
  { id: 'v2', label: 'Version 2', Component: Version2 },
];
// Render EuiTabs + active Component
```

## Handoff

- First-time stack → [run-kibana](run-kibana.md) + [ingest-data](ingest-data.md) if needed