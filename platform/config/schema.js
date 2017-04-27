// @flow

import { object, maybe, string, boolean } from '../lib/schema';
import { schema as server } from '../http';

export const schema = object({
  server,
  optimize: maybe(
    object({
      sourceMaps: string(),
      unsafeCache: boolean({
        defaultValue: true
      }),
      lazyPrebuild: boolean({
        defaultValue: false
      })
    })
  )
});
