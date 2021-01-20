/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRouter } from '../../http';
import { Logger } from '../../logging';

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
