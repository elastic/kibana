import { resolve } from 'path';
import { inspect } from 'util';

import { isInvalidPackError, isInvalidDirectoryError } from '../../errors';

export const PLUGINS_DIR = resolve(__dirname, 'fixtures/plugins');

export function assertInvalidDirectoryError(error) {
  if (!isInvalidDirectoryError(error)) {
    throw new Error(`Expected ${inspect(error)} to be an 'InvalidDirectoryError'`);
  }
}

export function assertInvalidPackError(error) {
  if (!isInvalidPackError(error)) {
    throw new Error(`Expected ${inspect(error)} to be an 'InvalidPackError'`);
  }
}
