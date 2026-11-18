/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl } from '@kbn/connector-emulate';
import type { VendorOperation } from '../../../../src/test/vendor_api/find_read_action';

export type { ReadAction, VendorOperation } from '../../../../src/test/vendor_api/find_read_action';
export { findReadAction } from '../../../../src/test/vendor_api/find_read_action';

// What vendors answer errors with varies, and the emulator checks a body against the spec's
// error response when it declares one, so the first body it accepts is the one served.
const ERROR_BODIES: ReadonlyArray<Record<string, unknown> | undefined> = [
  undefined,
  { message: 'Simulated vendor error' },
  { error: 'Simulated vendor error' },
  { error: { message: 'Simulated vendor error' } },
];

/** Makes the vendor answer an operation with an error status, with the first body the spec allows. */
export const setErrorStatus = async (
  control: EmulatorControl,
  { source, method, path: operationPath }: VendorOperation,
  status: number,
  bodies: typeof ERROR_BODIES = ERROR_BODIES
): Promise<void> => {
  const [body, ...others] = bodies;
  const rejected = await control.setFixtures([
    {
      operation: { source, method, path: operationPath },
      response: { status, ...(body === undefined ? {} : { body }) },
    },
  ]);
  if (rejected.length === 0) {
    return;
  }
  if (others.length === 0) {
    throw new Error(`The emulator rejected every body for ${status}: ${JSON.stringify(rejected)}`);
  }
  await setErrorStatus(control, { source, method, path: operationPath }, status, others);
};
