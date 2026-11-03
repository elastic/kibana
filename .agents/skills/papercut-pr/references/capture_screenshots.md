# Capturing before/after screenshots

Use a scratch Scout spec that is never committed. It reproduces the state from the user's screenshot, takes a screenshot, and optionally measures the thing that is wrong.

## Setup

1. Start the stack once and reuse it between "before" and "after":
   `node scripts/scout start-server --arch stateful --domain classic` (use the domain that matches the plugin, for example `--domain observability_complete` for Observability). Run it in the background and wait until `curl -u elastic:changeme http://localhost:<kibana port>/api/status` reports `available`. The port is in `.scout/servers/local.json`. Kibana runs in dev mode, so a code change shows up after a short rebuild.
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

Run it against the stack you already started with Playwright directly:

```bash
PAPERCUT_OUT_DIR="$TMP" PAPERCUT_LABEL=before \
  node scripts/playwright test --config <plugin>/test/scout/ui/playwright.config.ts \
  --project=local papercut_scratch
# apply the fix, wait about 20 seconds for the dev rebuild, then
PAPERCUT_OUT_DIR="$TMP" PAPERCUT_LABEL=after \
  node scripts/playwright test --config <plugin>/test/scout/ui/playwright.config.ts \
  --project=local papercut_scratch
```

- Write `--project=local` with an equals sign. `--project local <file>` makes Playwright read the file as a second project name.
- Do **not** call `node scripts/scout run-tests` while the server is running. It starts its own Elasticsearch and Kibana, and a second Elasticsearch on the same data directory damages the running one (shard path errors, Kibana "degraded"). If that happens, stop both and restart `start-server`. Use `run-tests` only when no server is running; it then starts and stops the stack by itself, which is also fine for a single capture.
- `node scripts/scout start-server --help` can keep running after it prints. If it does, kill it, and check `pgrep -fl "scout start-server"` before starting a real one.

The imports and fixtures above follow the existing Scout UI tests. Check the plugin's own spec for the exact fixture names, because they differ per solution.

## Guidance

- Match the viewport to the user's screenshot. If it is unknown, capture 1100px and 1472px wide; layout papercuts usually show up at one breakpoint.
- Capture only what a reviewer needs: the broken area, not a full page, unless context matters. A second full-page shot is fine when the fix could affect the surrounding layout.
- Use mocked or generated data for anything the screenshot shows. Never capture customer or real cluster data.
- If the problem cannot be reproduced on current `main`, stop. Tell the user, because it may already be fixed.
- To show a layout change in numbers, log `boundingBox()` of the first and last item and also compare their `y` values. A fix that aligns the columns can change the row spacing too, and that belongs in the PR's design-change line.
- Delete the scratch spec and the plugin's `test/scout/ui/.scout` directory, then run `git status` before committing.
- When you are done, stop the stack you started (the `scout start-server` process, its Elasticsearch and its Kibana). Other Kibana dev servers on the machine are not yours; leave them alone.
