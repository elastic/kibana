/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRouter } from '../../http';
import { IKibanaMigrator } from '../migrations';

export const registerMigrateRoute = (
  router: IRouter,
  migratorPromise: Promise<IKibanaMigrator>
) => {
  router.post(
    {
      path: '/_migrate',
      validate: false,
      options: {
        tags: ['access:migrateSavedObjects'],
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const migrator = await migratorPromise;
      await migrator.runMigrations({ rerun: true });
      return res.ok({
        body: {
          success: true,
        },
      });
    })
  );
};
