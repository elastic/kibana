/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Vendors the built `dist/` of `@elastic/adaptive-ui-host-kibana` — the
// batteries-included Kibana distribution — and its workspace closure into
// `vendor/`, rewriting cross-package `@elastic/*` specifiers to relative paths
// inside this one package. Upstream externalizes its siblings, so those
// specifiers have to resolve somewhere; resolving them inward is what lets
// Kibana carry one `@kbn/adaptive-ui` instead of one mirror per upstream
// package.
//
//   node src/platform/packages/shared/adaptive-ui/scripts/sync_dist.mjs \
//     --from /path/to/adaptive-ui-poc
//
// An `@elastic/adaptive-ui-*` specifier outside the closure throws, so a new
// upstream package surfaces here instead of at Kibana startup. Other `@elastic/*`
// specifiers (EUI, prismjs-esql) are peers Kibana supplies and are left alone.
// An unknown *subpath* of a package that IS in the closure also throws.
//
// The vendored `vendor/` tree and the `.vendored_upstream.json` stamp are
// gitignored: built output and the revision it came from live on disk only.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, '..');
const VENDOR_ROOT = join(PACKAGE_ROOT, 'vendor');

// Vendor directory name -> upstream workspace directory. The name is the npm
// package name minus the `@elastic/` scope, so a specifier maps to a directory
// without a second lookup table to keep in sync.
const CLOSURE = {
  'adaptive-ui-host-kibana': 'packages/host/adaptive-ui-host-kibana',
  'adaptive-ui-runtime': 'packages/core/adaptive-ui-runtime',
  'adaptive-ui-sdk': 'packages/core/adaptive-ui-sdk',
  distillate: 'packages/distillate',
  'adaptive-ui-theme-tokens': 'packages/theme/adaptive-ui-theme-tokens',
  'adaptive-ui-theme-borealis': 'packages/theme/adaptive-ui-theme-borealis',
  'adaptive-ui-primitives-components': 'packages/primitives/adaptive-ui-primitives-components',
  'adaptive-ui-primitives-charts': 'packages/primitives/adaptive-ui-primitives-charts',
  'adaptive-ui-primitives-diagrams': 'packages/primitives/adaptive-ui-primitives-diagrams',
  'adaptive-ui-render-svg': 'packages/image/adaptive-ui-render-svg',
  'adaptive-ui-svg-takumi': 'packages/image/adaptive-ui-svg-takumi',
};

// `from '...'`, `import('...')`, and bare `import '...'`, single or double
// quoted, with no newline inside the specifier. Matching the statement form
// rather than the bare string keeps prose in comments — of which upstream has
// plenty, naming sibling packages — out of the rewrite.
const SPECIFIER_PATTERN = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(@elastic\/[^'"\n]+)\2/g;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const fromIndex = args.indexOf('--from');
  if (fromIndex === -1 || !args[fromIndex + 1]) {
    throw new Error('Missing --from <path to upstream adaptive-ui-poc root>');
  }
  return { from: resolve(args[fromIndex + 1]) };
};

/**
 * Each closure package's export subpath -> its path under `dist/`, read from
 * the package's own `exports` map so a renamed or added entry point needs no
 * change here. `.` becomes the bare package specifier; `./react` becomes
 * `@elastic/<name>/react`.
 */
const readExportMaps = (upstreamRoot) => {
  const maps = new Map();
  for (const [name, packageDir] of Object.entries(CLOSURE)) {
    const manifestPath = join(upstreamRoot, packageDir, 'package.json');
    const { exports: exportMap = {} } = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const subpaths = new Map();
    for (const [key, target] of Object.entries(exportMap)) {
      const importTarget = typeof target === 'string' ? target : target.import;
      if (importTarget === undefined) {
        continue;
      }
      // `./dist/entries/html.js` -> `entries/html.js`, the path inside the
      // vendored tree, since only `dist/` is copied.
      subpaths.set(key, importTarget.replace(/^\.\/dist\//, ''));
    }
    maps.set(name, subpaths);
  }
  return maps;
};

const splitSpecifier = (specifier) => {
  const withoutScope = specifier.slice('@elastic/'.length);
  const slash = withoutScope.indexOf('/');
  if (slash === -1) {
    return { name: withoutScope, subpath: '.' };
  }
  return {
    name: withoutScope.slice(0, slash),
    subpath: `./${withoutScope.slice(slash + 1)}`,
  };
};

/**
 * Rewrites every closure specifier in one file to a relative path. Upstream
 * emits explicit `.js` extensions in its ESM and extensionless specifiers in
 * its declarations, so each keeps its own convention.
 */
const rewriteFile = (source, fileDir, exportMaps, isDeclaration) =>
  source.replace(SPECIFIER_PATTERN, (match, prefix, quote, specifier) => {
    const { name, subpath } = splitSpecifier(specifier);
    const subpaths = exportMaps.get(name);
    if (subpaths === undefined) {
      if (specifier.startsWith('@elastic/adaptive-ui-')) {
        throw new Error(
          `"${specifier}" is an Adaptive UI package outside this script's CLOSURE. Add it to CLOSURE, or Kibana cannot resolve the rewritten specifier.`
        );
      }
      return match; // a peer Kibana supplies: `@elastic/eui`, `@elastic/prismjs-esql`
    }
    const distPath = subpaths.get(subpath);
    if (distPath === undefined) {
      throw new Error(
        `"${specifier}" is not an export of @elastic/${name}. Add the new entry point to this script's closure handling, or check the upstream build.`
      );
    }
    const target = join(VENDOR_ROOT, name, distPath);
    let relativePath = relative(fileDir, target).split('\\').join('/');
    if (!relativePath.startsWith('.')) {
      relativePath = `./${relativePath}`;
    }
    if (isDeclaration) {
      relativePath = relativePath.replace(/\.js$/, '');
    }
    return `${prefix}${quote}${relativePath}${quote}`;
  });

// Kibana transpiles this ESM to CJS for jest and the server, where
// `import.meta` is a parse error — in the file as written, whether or not the
// branch using it runs.
//
// One site survives upstream's build: `@elastic/adaptive-ui-render-svg`
// resolving its own location to find bundled fonts, isolated in a
// dynamically-imported leaf chunk so a caller supplying `fontDir` never loads
// it. `__filename` is the exact CJS equivalent, so rewriting keeps even the
// fallback path working rather than relying on every call site passing a
// directory.
const rewriteImportMeta = (source) =>
  source.replace(/[A-Za-z_$][\w$]*\.fileURLToPath\(import\.meta\.url\)/g, '__filename');

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

/** Absolute `sources` so the map still reaches the upstream checkout after it is copied into `vendor/`. */
const vendorDeclarationMap = (upstreamDeclaration, targetDeclaration) => {
  const mapPath = `${upstreamDeclaration}.map`;
  if (!existsSync(mapPath)) {
    return undefined;
  }
  const map = JSON.parse(readFileSync(mapPath, 'utf8'));
  const mapDir = dirname(upstreamDeclaration);
  const root = map.sourceRoot ? resolve(mapDir, map.sourceRoot) : mapDir;
  map.sourceRoot = '';
  map.file = basename(targetDeclaration);
  map.sources = map.sources.map((source) => resolve(root, source));
  writeFileSync(`${targetDeclaration}.map`, `${JSON.stringify(map)}\n`);
  return `${basename(targetDeclaration)}.map`;
};

const syncPackage = (name, upstreamRoot, exportMaps) => {
  const upstreamPackageRoot = join(upstreamRoot, CLOSURE[name]);
  const sourceDist = join(upstreamPackageRoot, 'dist');
  const destination = join(VENDOR_ROOT, name);
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });

  let copied = 0;
  let rewritten = 0;
  let declarationMaps = 0;
  for (const file of walk(sourceDist)) {
    // JS source maps are not vendored: a dangling `sourceMappingURL` makes SWC
    // fail every file it transpiles at Kibana startup. Declaration maps are
    // rewritten onto the vendored `.d.ts` so Cmd+click reaches upstream `src/`.
    if (file.endsWith('.js.map') || file.endsWith('.d.ts.map')) {
      continue;
    }
    const target = join(destination, relative(sourceDist, file));
    mkdirSync(dirname(target), { recursive: true });
    const isDeclaration = file.endsWith('.d.ts');
    if (file.endsWith('.js') || isDeclaration) {
      let source = rewriteImportMeta(
        readFileSync(file, 'utf8').replace(/^\/\/# sourceMappingURL=.*$\n?/gm, '')
      );
      source = rewriteFile(source, dirname(target), exportMaps, isDeclaration);
      if (isDeclaration) {
        const mapUrl = vendorDeclarationMap(file, target);
        if (mapUrl !== undefined) {
          source = `${source.replace(/\s*$/, '')}\n//# sourceMappingURL=${mapUrl}\n`;
          declarationMaps += 1;
        }
      }
      writeFileSync(target, source);
      rewritten += 1;
    } else {
      cpSync(file, target);
    }
    copied += 1;
  }
  return { copied, rewritten, declarationMaps };
};

const readUpstreamSha = (upstreamRoot) => {
  try {
    // A linked worktree — the clean way to build a pinned SHA while the main
    // checkout is mid-edit — has a `.git` *file* (`gitdir: <path>`), not a dir.
    const dotGit = join(upstreamRoot, '.git');
    const gitDir = statSync(dotGit).isFile()
      ? readFileSync(dotGit, 'utf8').replace('gitdir:', '').trim()
      : dotGit;
    const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref:')) {
      return head; // detached HEAD holds the SHA directly (the worktree case)
    }
    const ref = head.slice(4).trim();
    // A worktree's branch refs live in the shared common dir, not its own gitdir.
    let baseDir = gitDir;
    try {
      baseDir = resolve(gitDir, readFileSync(join(gitDir, 'commondir'), 'utf8').trim());
    } catch {
      // No `commondir`: `gitDir` is the repository itself.
    }
    return readFileSync(join(baseDir, ref), 'utf8').trim();
  } catch {
    return 'unknown';
  }
};

const main = () => {
  const { from } = parseArgs();
  const sha = readUpstreamSha(from);
  const exportMaps = readExportMaps(from);
  // eslint-disable-next-line no-console
  console.log(`Vendoring @elastic/adaptive-ui-host-kibana @ ${sha} from ${from}`);

  rmSync(VENDOR_ROOT, { recursive: true, force: true });
  let declarationMaps = 0;
  for (const name of Object.keys(CLOSURE)) {
    const result = syncPackage(name, from, exportMaps);
    declarationMaps += result.declarationMaps;
    // eslint-disable-next-line no-console
    console.log(
      `  ${name}: ${result.copied} files (${result.rewritten} rewritten, ${result.declarationMaps} declaration maps)`
    );
  }

  // `@kbn/adaptive-ui/styles.css` resolves to the package root through the
  // tsconfig path map, so mirror the vendored sheet there.
  cpSync(
    join(VENDOR_ROOT, 'adaptive-ui-host-kibana', 'styles.css'),
    join(PACKAGE_ROOT, 'styles.css')
  );

  const stamp = join(PACKAGE_ROOT, '.vendored_upstream.json');
  writeFileSync(
    stamp,
    `${JSON.stringify(
      {
        repository: 'elastic/adaptive-ui-poc',
        package: '@elastic/adaptive-ui-host-kibana',
        sha,
        from,
        vendoredAt: new Date().toISOString(),
      },
      null,
      2
    )}\n`
  );
  // eslint-disable-next-line no-console
  console.log(
    `Done. Stamped ${relative(
      PACKAGE_ROOT,
      stamp
    )} (${declarationMaps} declaration maps for IDE navigation).`
  );
};

main();
