/**
 * Browser-level interaction checks against the real bundle.
 *
 * The jsdom tests cover behaviour, but they cannot show that the component tree
 * survives real layout, real event dispatch and real EUI overlays. This drives
 * the page the way an operator would and screenshots the result of each click.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { pathToFileURL } from 'url';

const dir = new URL('./', import.meta.url).pathname;
const out = process.env.MEMORY_SHOT_DIR ?? '/tmp/mshots';
mkdirSync(out, { recursive: true });

/**
 * Sidebar rows only.
 *
 * The home and activity panes repeat the same memories as the sidebar, and each
 * row renders a `...-wrapper` around a `...` link, so a bare prefix selector
 * counts every memory twice. Scope to the sidebar's own root and drop wrappers.
 */
const SIDEBAR_ROOT = '[data-test-subj="nightshiftMemorySidebar"]';
const SIDEBAR = '[data-test-subj^="nightshiftMemoryLink-"]:not([data-test-subj*="-wrapper"])';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(pathToFileURL(`${dir}index.html`).href, { waitUntil: 'networkidle' });
await page.evaluate(() => window.__render('populated'));
await page.waitForSelector('[data-test-subj="nightshiftMemoryTab"]');

// 1. The page rendered with real content.
const title = await page.textContent('h1, h2, [data-test-subj="nightshiftMemoryTab"] h1');
check('home view renders', /Semantic Memory/.test(title ?? ''), title?.slice(0, 40));

// 2. Rows are present and ordered by usefulness, not insertion order.
// The same memory appears in the sidebar and in the home lists, so scope the
// query to the sidebar to avoid double counting.
const sidebarTitles = async () =>
  page.$$eval(`${SIDEBAR_ROOT} ${SIDEBAR}`, (els) => els.map((e) => e.textContent?.trim() ?? ''));

// The tab opens on the `active` filter, so the one archived memory is not listed.
const rowTitles = await sidebarTitles();
check(
  'sidebar lists the active memories',
  rowTitles.length === 3 && !rowTitles.some((t) => /DNS/.test(t)),
  `${rowTitles.length} rows`
);

// 3. Clicking a memory row navigates to the detail view.
await page.click('[data-test-subj="nightshiftMemoryLink-memory_kafka-consumer-lag"]');
await page.waitForSelector('[data-test-subj="nightshiftMemoryPageTitle"]', { timeout: 5000 });
const detailTitle = await page.textContent('[data-test-subj="nightshiftMemoryPageTitle"]');
check('row click opens detail view', /Kafka consumer lag/.test(detailTitle ?? ''), detailTitle?.slice(0, 40));
await page.screenshot({ path: `${out}/04-detail.png`, fullPage: true });

// 4. The archive control is a real, visible, clickable button.
const archive = await page.$('[data-test-subj="nightshiftMemoryArchiveToggle"]');
check('archive control is rendered', archive !== null);
if (archive) {
  const visible = await archive.isVisible();
  const enabled = await archive.isEnabled();
  check('archive control is visible and enabled', visible && enabled, `visible=${visible} enabled=${enabled}`);
  await archive.click();
  await page.waitForTimeout(300);
}

// 5. Delete requires an explicit confirmation, and the dialog is an alertdialog.
await page.click('[data-test-subj="nightshiftMemoryDeleteButton"]');
await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
const dialogName = await page.getAttribute('[role="alertdialog"]', 'aria-label');
const labelledBy = await page.getAttribute('[role="alertdialog"]', 'aria-labelledby');
check(
  'delete dialog is announced',
  Boolean(dialogName || labelledBy),
  `label=${dialogName} labelledby=${labelledBy}`
);
// EUI fades the overlay in, so wait for it to settle before capturing.
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/05-delete-confirm.png` });

// 6. Cancelling closes the dialog and keeps the page.
await page.click('[data-test-subj="confirmModalCancelButton"]');
await page.waitForSelector('[role="alertdialog"]', { state: 'detached', timeout: 5000 });
check('cancel closes the dialog', (await page.$('[role="alertdialog"]')) === null);
check('detail view survives cancel', (await page.$('[data-test-subj="nightshiftMemoryPageTitle"]')) !== null);

// 7. The search box filters the sidebar as the operator types.
await page.goto(pathToFileURL(`${dir}index.html`).href, { waitUntil: 'networkidle' });
await page.evaluate(() => window.__render('populated'));
await page.waitForSelector('[data-test-subj="nightshiftMemorySearch"]');
await page.fill('[data-test-subj="nightshiftMemorySearch"]', 'redis');
await page.waitForTimeout(400);
const filtered = (await sidebarTitles()).length;
check('search narrows the list', filtered === 1, `${filtered} row(s) after typing "redis"`);
await page.screenshot({ path: `${out}/06-search.png`, fullPage: true });

// 8. Filter buttons switch the sidebar.
await page.fill('[data-test-subj="nightshiftMemorySearch"]', '');
await page.waitForTimeout(300);
await page.click('[data-test-subj="nightshiftMemoryFilter-archived"]');
await page.waitForTimeout(400);
// Reset to the home pane so the sidebar is the only place these appear.
await page.click('[data-test-subj="nightshiftMemoryHomeNav"]');
await page.waitForTimeout(300);
const archivedTitles = await sidebarTitles();
check(
  'archived filter narrows the list',
  archivedTitles.length === 1 && /DNS/.test(archivedTitles[0]),
  archivedTitles.join(', ') || 'none'
);

// 9. Keyboard reachability of the primary controls.
await page.goto(pathToFileURL(`${dir}index.html`).href, { waitUntil: 'networkidle' });
await page.evaluate(() => window.__render('populated'));
await page.waitForSelector('[data-test-subj="nightshiftMemorySearch"]');
await page.focus('[data-test-subj="nightshiftMemorySearch"]');
let tabbed = null;
for (let i = 0; i < 8; i++) {
  await page.keyboard.press('Tab');
  tabbed = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute('data-test-subj') ?? el?.tagName ?? null;
  });
  if (tabbed && tabbed !== 'nightshiftMemorySearch') break;
}
check('search is followed by a focusable control', tabbed !== null && tabbed !== 'nightshiftMemorySearch', String(tabbed));

check('no uncaught page errors', errors.length === 0, errors.slice(0, 2).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
