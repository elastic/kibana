# Testing and troubleshooting

## Running tests

```bash
yarn kbn bootstrap
node scripts/jest src/platform/kbn-ui/side-navigation             # run all tests
node scripts/jest src/platform/kbn-ui/side-navigation --watch     # watch mode
node scripts/jest src/platform/kbn-ui/side-navigation --coverage  # with coverage
```

## Storybook

```bash
yarn storybook shared_ux
```

Open `http://localhost:9001` — navigation stories live under the shared UX section.

## What is covered

- Expanded, collapsed, and combined modes (snapshots + behavior).
- Responsive overflow and More menu item counts.
- Hover timeouts, scroll-to-active, and focus utilities.
- New badge caps and `localStorage` dismissal logic.

## What is not covered here

- Full Kibana chrome integration (see [kibana-integration.md](./kibana-integration.md)).
- Cross-solution IA correctness — that is a product and QA concern.

## Common issues

| Symptom | Likely cause |
| --- | --- |
| Wrong active highlight | `activeItemId` does not match any `id` in the tree |
| More menu missing | Item count ≤ 12 and all items fit vertically |
| Nav always collapsed | Viewport within xs/s breakpoints (`useIsWithinBreakpoints`) |
| New badge never clears | Item id changed; stale `core.chrome.sidenav.newItems` entry in `localStorage` |
| Width layout jump | `setWidth` not wired to parent grid slot |

## Packaging

External widget build, i18n, and additional troubleshooting notes:

- `packaging/BUILD.md`
- `packaging/I18N.md`
- `packaging/TROUBLESHOOTING.md`
