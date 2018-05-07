import { resolve } from 'path';
import { statSync } from 'fs';

export function isOSS() {
  try {
    statSync(resolve(__dirname, '../../../node_modules/x-pack'));
    return false;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return true;
    }

    throw error;
  }
}
