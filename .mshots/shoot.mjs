import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { pathToFileURL } from 'url';

const dir = new URL('./', import.meta.url).pathname;
const out = process.env.MEMORY_SHOT_DIR ?? '/tmp/mshots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [name, width] of [['01-home', 1440], ['02-home-narrow', 900], ['03-empty', 1440]]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(`${dir}index.html`).href, { waitUntil: 'networkidle' });
  await page.evaluate((n) => window.__render(n), name.startsWith('03') ? 'empty' : 'populated');
  await page.waitForSelector('[data-test-subj="nightshiftMemoryTab"]', { timeout: 10000 });
  await page.waitForTimeout(600);
  const styles = await page.evaluate(() => document.querySelectorAll('style').length);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log('WROTE', name, 'styles=', styles);
  await page.close();
}
await browser.close();
