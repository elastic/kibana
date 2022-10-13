/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EsConfigApiResponse } from '../../../../../common/types/api_responses';
import { RouteDependencies } from '../../..';

export const registerEsConfigRoute = ({ router, services }: RouteDependencies): void => {
  router.get({ path: '/api/console/es_config', validate: false }, async (ctx, req, res) => {
    const {
      hosts: [host],
    } = await services.esLegacyConfigService.readConfig();

    const body: EsConfigApiResponse = { host };

    return res.ok({ body });
  });
};
