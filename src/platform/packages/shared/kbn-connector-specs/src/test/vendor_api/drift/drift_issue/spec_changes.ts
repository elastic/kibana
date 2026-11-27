/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** How the changes `oasdiff` found are listed in an issue: as a folded table. */

import type { ConnectorDrift, SpecChange } from '../detect_drift';
import { cell, code, plural } from './issue_markdown';

const MAX_SPEC_CHANGE_ROWS = 60;
const KIND_ORDER: readonly SpecChange['kind'][] = ['breaking', 'deprecation', 'non-breaking'];

/** Every spec change, as a folded table, after the sources that didn't load or weren't classified. */
export const specChanges = (drift: ConnectorDrift): string[] => {
  const notes: string[] = [];
  const rows: Array<{ source: string; change: SpecChange }> = [];
  for (const [name, { status, error, changes }] of Object.entries(drift.sources)) {
    if (status === 'unreachable') {
      notes.push(`- ${code(name)}: unreachable: ${code(error ?? 'unknown error')}`);
    } else if (status === 'changed' && changes === undefined) {
      notes.push(`- ${code(name)}: changed, not classified (no \`oasdiff\` was available)`);
    } else {
      rows.push(...(changes ?? []).map((change) => ({ source: name, change })));
    }
  }
  rows.sort((a, b) => KIND_ORDER.indexOf(a.change.kind) - KIND_ORDER.indexOf(b.change.kind));
  const withSource = new Set(rows.map(({ source }) => source)).size > 1;
  const shown = rows.slice(0, MAX_SPEC_CHANGE_ROWS);
  return [
    ...(notes.length > 0 ? [...notes, ''] : []),
    ...(rows.length > 0
      ? [
          `<details><summary>${plural(rows.length, 'spec change')}</summary>`,
          '',
          `| Kind |${withSource ? ' Source |' : ''} Operation | Change | Rule |`,
          `|---|${withSource ? '---|' : ''}---|---|---|`,
          ...shown.map(
            ({ source, change: { kind, operation, text, id } }) =>
              `| ${kind} |${withSource ? ` ${code(source)} |` : ''} ${
                operation ? code(operation) : '—'
              } | ${cell(text)} | ${code(id)} |`
          ),
          ...(rows.length > shown.length
            ? ['', `…and ${rows.length - shown.length} more; run the check for all of them.`]
            : []),
          '',
          '</details>',
          '',
        ]
      : []),
  ];
};
