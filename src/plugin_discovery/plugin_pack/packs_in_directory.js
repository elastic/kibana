import { isInvalidDirectoryError } from '../errors';

import { createChildDirectory$ } from './lib';
import { createPackAtPath$ } from './pack_at_path';

/**
 *  Finds the plugins within a directory. Results are
 *  an array of objects with either `pack` or `error`
 *  keys.
 *
 *   - `{ error }` results are provided when the path is not
 *     a directory, or one of the child directories is not a
 *     valid plugin pack.
 *   - `{ pack }` results are for discovered plugins defs
 *
 *  @param  {String} path
 *  @return {Array<{pack}|{error}>}
 */
export const createPacksInDirectory$ = (path) => (
  createChildDirectory$(path)
    .mergeMap(createPackAtPath$)
    .catch(error => {
      // this error is produced by createChildDirectory$() when the path
      // is invalid, we return them as an error result similar to how
      // createPackAtPath$ works when it finds invalid packs in a directory
      if (isInvalidDirectoryError(error)) {
        return [{ error }];
      }

      throw error;
    })
);
