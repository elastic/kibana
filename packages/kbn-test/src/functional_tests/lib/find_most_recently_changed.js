import { isAbsolute } from 'path';
import { statSync } from 'fs';

import glob from 'glob';

/**
 *  Find the most recently modified file that matches the pattern pattern
 *
 *  @param  {String} pattern absolute path with glob expressions
 *  @return {String} Absolute path
 */
export function findMostRecentlyChanged(pattern) {
  if (!isAbsolute(pattern)) {
    throw new TypeError(`Pattern must be absolute, got ${pattern}`);
  }

  const ctime = path => statSync(path).ctime.getTime();

  return glob
    .sync(pattern)
    .sort((a, b) => ctime(a) - ctime(b))
    .pop();
}
