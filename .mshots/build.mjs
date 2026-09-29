import { build } from 'esbuild';
import { writeFileSync } from 'fs';

const entry = new URL('./entry.tsx', import.meta.url).pathname;

// Rewrite the component's import of ./use_memory to the local stub, so the
// harness does not need Kibana services.
const alias = {
  name: 'stub-hooks',
  setup(b) {
    // The component's hooks need Kibana services, so point them at a stub.
    b.onResolve({ filter: /use_memory$/ }, () => ({ path: new URL('./hooks_mock.ts', import.meta.url).pathname }));
    // kbn-tinymath (pulled in transitively) ships a .peggy grammar the UI never
    // calls; stub it rather than wiring a peggy loader.
    b.onResolve({ filter: /\.peggy$/ }, () => ({ path: new URL('./empty.js', import.meta.url).pathname }));
    // The app's own useKibana hook unwraps context.services, which does not exist
    // outside a booted Kibana. The Memory page only reads the Nightshift client
    // from it, so provide that and leave the rest out.
    b.onResolve({ filter: /hooks\/use_kibana$/ }, () => ({ path: new URL('./kibana_stub.ts', import.meta.url).pathname }));
  },
};

await build({
  entryPoints: [entry],
  bundle: true,
  outfile: new URL('./bundle.js', import.meta.url).pathname,
  platform: 'browser',
  format: 'iife',
  jsx: 'transform',
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [alias],
  logLevel: 'error',
  external: [],
});
console.log('BUNDLED');
