#!/usr/bin/env python3
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the "Elastic License
# 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
# Public License v 1"; you may not use this file except in compliance with, at
# your election, the "Elastic License 2.0", the "GNU Affero General Public
# License v3.0 only", or the "Server Side Public License, v 1".

"""Write entry.js for every non-example, non-test server plugin."""
import os
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path(os.environ.get('KBN_REPO', HERE.parents[1]))
OUT_DIR = Path(os.environ.get('KBN_PLUGIN_BUNDLE_OUT', '/tmp/kibana-server-plugin-bundle'))
OUT = OUT_DIR / 'entry.js'

SKIP_PREFIXES = (
    'examples/',
    'x-pack/examples/',
    'src/platform/test/',
    'x-pack/platform/test/',
    'x-pack/solutions/search/test/',
    'x-pack/solutions/observability/test/',
    'x-pack/solutions/security/test/',
)

plugins = []
skipped = []
for manifest in REPO.rglob('kibana.jsonc'):
    if 'node_modules' in manifest.parts or 'target' in manifest.parts:
        continue
    rel = manifest.parent.relative_to(REPO).as_posix()
    if rel.startswith(SKIP_PREFIXES):
        continue
    text = manifest.read_text(errors='replace')
    if not re.search(r'"type"\s*:\s*"plugin"', text):
        continue
    if not re.search(r'"server"\s*:\s*true', text):
        skipped.append(rel + ' (no server)')
        continue
    entry = None
    for name in ('index.ts', 'index.js', 'index.tsx'):
        candidate = manifest.parent / 'server' / name
        if candidate.is_file():
            entry = candidate
            break
    if entry is None:
        skipped.append(rel + ' (no server/index)')
        continue
    pkg_id_match = re.search(r'"id"\s*:\s*"([^"]+)"', text)
    pkg_id = pkg_id_match.group(1) if pkg_id_match else ''
    plugins.append((rel, pkg_id))

plugins.sort()
repo_literal = str(REPO)
lines = [
    "const path = require('path');",
    f"const REPO = {repo_literal!r};",
    'const modules = Object.create(null);',
    'function add(rootRel, pkgId, mod) {',
    "  modules[path.join(REPO, rootRel, 'server')] = mod;",
    "  modules[rootRel + '/server'] = mod;",
    # Distributable package-map.json points plugins at node_modules/<id>.
    "  if (pkgId) modules['node_modules/' + pkgId + '/server'] = mod;",
    '}',
]
for rel, pkg_id in plugins:
    abs_entry = REPO / rel / 'server' / 'index.ts'
    if not abs_entry.is_file():
        abs_entry = REPO / rel / 'server' / 'index.js'
    if not abs_entry.is_file():
        abs_entry = REPO / rel / 'server' / 'index.tsx'
    lines.append(f"add({rel!r}, {pkg_id!r}, require({str(abs_entry)!r}));")
lines += [
    'globalThis.__KBN_PLUGIN_MODULES = modules;',
    'module.exports = modules;',
    '',
]
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT.write_text('\n'.join(lines))
print(f'plugins {len(plugins)} skipped {len(skipped)} -> {OUT}')
for item in skipped:
    print('  skip', item)
