/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { pipe } from 'fp-ts/function';
import { payload, noop, areValid, print, expectedFlags, format } from './utils';
import { types } from './saved_object_info';

export { SavedObjectInfoService } from './saved_object_info';

export const runSavedObjInfoSvc = () =>
  run(
    async ({ flags, log }) => {
      const justJson: boolean = !!flags.json;

      const resolveDotKibana = async () => await types(flags.esUrl as string)();

      return areValid(flags)
        ? justJson
          ? pipe(await resolveDotKibana(), JSON.stringify.bind(null), log.write.bind(log))
          : pipe(await resolveDotKibana(), format, payload, print(log)())
        : noop();
    },
    {
      description: `

Show information pertaining to the saved objects in the .kibana index

Examples:

See 'saved_objects_info_svc.md'

      `,
      flags: expectedFlags(),
    }
  );
