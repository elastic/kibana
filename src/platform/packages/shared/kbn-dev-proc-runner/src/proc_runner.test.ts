/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { ProcRunner } from './proc_runner';

it('returns the in-progress teardown when teardown() is called again', async () => {
  const procs = new ProcRunner(new ToolingLog());

  const firstTeardown = procs.teardown();

  expect(procs.teardown('SIGTERM')).toBe(firstTeardown);
  await firstTeardown;
});
