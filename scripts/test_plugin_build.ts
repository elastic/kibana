/*
 * Quick test script to build specific plugins with Vite/Rolldown.
 * Usage: node --experimental-transform-types scripts/test_plugin_build.ts [pluginId1] [pluginId2] ...
 *
 * Example:
 *   node --experimental-transform-types scripts/test_plugin_build.ts monitoring maps
 */

import { lastValueFrom, tap } from 'rxjs';
import Path from 'path';
import { fileURLToPath } from 'url';

const __dirname = Path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = Path.resolve(__dirname, '..');

const pluginFilter = process.argv.slice(2);
if (pluginFilter.length === 0) {
  console.error('Usage: node --experimental-transform-types scripts/test_plugin_build.ts <pluginId1> [pluginId2] ...');
  console.error('Example: node --experimental-transform-types scripts/test_plugin_build.ts monitoring maps');
  process.exit(1);
}

console.log(`Building plugins: ${pluginFilter.join(', ')}`);

const { runOptimizer } = await import('@kbn/vite-optimizer');
type OptimizerEvent = { type: string; message?: string; result?: any; progress?: any; results?: any[] };

await lastValueFrom(
  runOptimizer({
    repoRoot: REPO_ROOT,
    dist: true,
    pluginFilter,
  }).pipe(
    tap((event: OptimizerEvent) => {
      switch (event.type) {
        case 'starting':
          console.log(`[START] ${event.message}`);
          break;
        case 'plugin-starting':
          console.log(`[BUILD] ${event.message}`);
          break;
        case 'plugin-complete':
          if (event.result?.success) {
            console.log(`[OK] ${event.message}`);
          } else {
            console.error(`[FAIL] ${event.message}`);
          }
          break;
        case 'complete':
          console.log(`[DONE] ${event.message}`);
          break;
        case 'error':
          console.error(`[ERROR] ${event.message}`);
          if (event.results) {
            for (const r of event.results.filter((r: any) => !r.success)) {
              console.error(`  Failed: ${r.bundleId}`);
              for (const err of r.errors ?? []) {
                console.error(`    ${err}`);
              }
            }
          }
          break;
      }
    })
  )
);
