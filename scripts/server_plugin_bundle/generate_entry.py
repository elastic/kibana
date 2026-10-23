#!/usr/bin/env python3
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the "Elastic License
# 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
# Public License v 1"; you may not use this file except in compliance with, at
# your election, the "Elastic License 2.0", the "GNU Affero General Public
# License v3.0 only", or the "Server Side Public License, v 1".

"""Write one rspack entry per non-example, non-test server plugin."""
import json
import os
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path(os.environ.get('KBN_REPO', HERE.parents[1]))
OUT_DIR = Path(os.environ.get('KBN_PLUGIN_BUNDLE_OUT', '/tmp/kibana-server-plugin-bundle'))
ENTRIES_DIR = OUT_DIR / 'entries'

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
OUT_DIR.mkdir(parents=True, exist_ok=True)
ENTRIES_DIR.mkdir(parents=True, exist_ok=True)
for old in OUT_DIR.glob('*.cjs'):
    old.unlink()

entries = []
manifest = {}
for index, (rel, pkg_id) in enumerate(plugins):
    abs_entry = REPO / rel / 'server' / 'index.ts'
    if not abs_entry.is_file():
        abs_entry = REPO / rel / 'server' / 'index.js'
    if not abs_entry.is_file():
        abs_entry = REPO / rel / 'server' / 'index.tsx'
    name = f'p{index}'
    keys = [str(REPO / rel / 'server'), f'{rel}/server']
    # Distributable package-map.json points plugins at node_modules/<id>.
    if pkg_id:
        keys.append(f'node_modules/{pkg_id}/server')
    assigns = '\n'.join(f'global.__KBN_PLUGIN_MODULES[{key!r}] = mod;' for key in keys)
    entry_path = ENTRIES_DIR / f'{name}.js'
    entry_path.write_text(
        'var mod = require(' + repr(str(abs_entry)) + ');\n'
        'if (!global.__KBN_PLUGIN_MODULES) global.__KBN_PLUGIN_MODULES = Object.create(null);\n'
        + assigns
        + '\nmodule.exports = mod;\n'
    )
    entries.append({'name': name, 'file': str(entry_path)})
    for key in keys:
        manifest[key] = name + '.cjs'

(OUT_DIR / 'entries.json').write_text(json.dumps(entries))
(OUT_DIR / 'manifest.json').write_text(json.dumps(manifest))
print(f'plugins {len(plugins)} skipped {len(skipped)} -> {ENTRIES_DIR}')
for item in skipped:
    print('  skip', item)
