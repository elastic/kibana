/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '../../http';
import { Logger } from '../../logging';
// TODO: Remove this route (https://github.com/elastic/kibana/issues/103921 bullet point 2)
export const registerLogLegacyImportRoute = (router: IRouter, logger: Logger) => {
  router.post(
    {
      path: '/_log_legacy_import',
      validate: false,
    },
    async (context, req, res) => {
      logger.warn('Importing saved objects from a .json file has been deprecated');
      return res.ok({ body: { success: true } });
    }
  );
};
