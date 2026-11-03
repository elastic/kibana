/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DoctorCheck } from '../types';
import { fail, pass } from '../types';
import { tryExec } from '../utils';

export const qafChecks: DoctorCheck[] = [
  {
    title: 'QAF installation',
    run: async () => {
      // qaf doctor exits with 0 even when checks fail, so read its ✓/✗ lines
      const output = await tryExec('qaf', ['doctor']);
      if (output === undefined) {
        return fail('QAF is not installed', { hint: 'see the QAF getting started docs' });
      }

      const version = output.match(/QAF:\s*(\S+)/)?.[1] ?? 'unknown version';
      const failed = output.split('\n').flatMap((line) => {
        const title = line.match(/^✗\s+(.+)/)?.[1];
        return title ? [title] : [];
      });
      if (!failed.length) {
        return pass(`QAF ${version} · qaf doctor passed`);
      }

      return fail(
        `QAF ${version} · qaf doctor failed: ${failed.join(', ')}`,
        output.includes('Treatment:')
          ? { fix: { command: 'qaf doctor --treat' } }
          : { hint: 'run qaf doctor for details' }
      );
    },
  },
];
