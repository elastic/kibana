# Capturing before/after screenshots

Use a scratch Scout spec that is never committed. It reproduces the state from the user's screenshot, takes a screenshot, and optionally measures the thing that is wrong.

## Setup

1. Start the stack once and reuse it between "before" and "after":
   `node scripts/scout start-server --arch stateful --domain classic` (use the domain that matches the plugin, for example `--domain observability_complete` for Observability).
2. Put the scratch spec in the plugin's existing Scout UI test directory (`<plugin>/test/scout*/ui/tests/`) so it picks up the plugin's fixtures and config. Name it `papercut_scratch.spec.ts` and delete it when done.
3. Write screenshots to a temp directory outside the repo, for example `$(mktemp -d)`, and pass the path in an environment variable.

## Spec pattern

Copy the imports, tags, `beforeAll` setup (feature flags, mocked data) and `test` fixture from the plugin's existing spec, then keep only the part that reaches the broken state. The capture itself is:

```ts
const outDir = process.env.PAPERCUT_OUT_DIR ?? '';
const label = process.env.PAPERCUT_LABEL ?? 'before'; // 'before' or 'after'
const width = 1100;

test(`capture ${label}`, async ({ page, browserAuth }) => {
  await browserAuth.loginAsAdmin();
  await page.setViewportSize({ width, height: 800 });
  await page.gotoApp('<app id>', { path: '<route>' });
  // wait for the specific element, not a fixed timeout
  const target = page.testSubj.locator('<test subject of the broken area>');
  await target.waitFor();

  // optional: measure what is wrong so the PR can quote numbers
  const box = await target.boundingBox();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ label, width, x: box?.x, y: box?.y }));

  await page.screenshot({ path: `${outDir}/${label}-<area>-${width}.png` });
});
```

Run it:

```bash
PAPERCUT_OUT_DIR="$TMP" PAPERCUT_LABEL=before \
  node scripts/scout run-tests --arch stateful --domain classic --testFiles <path to scratch spec>
# apply the fix, then
PAPERCUT_OUT_DIR="$TMP" PAPERCUT_LABEL=after \
  node scripts/scout run-tests --arch stateful --domain classic --testFiles <path to scratch spec>
```

The imports and fixtures above follow the existing Scout UI tests. Check the plugin's own spec for the exact fixture names, because they differ per solution.

## Guidance

- Match the viewport to the user's screenshot. If it is unknown, capture 1100px and 1472px wide; layout papercuts usually show up at one breakpoint.
- Capture only what a reviewer needs: the broken area, not a full page, unless context matters. A second full-page shot is fine when the fix could affect the surrounding layout.
- Use mocked or generated data for anything the screenshot shows. Never capture customer or real cluster data.
- If the problem cannot be reproduced on current `main`, stop. Tell the user, because it may already be fixed.
- Delete the scratch spec and run `git status` before committing.
