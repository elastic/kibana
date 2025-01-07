/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IConfigService } from '@kbn/config';
import { DeprecationsFactory } from '../deprecations_factory';

interface RegisterConfigDeprecationsInfo {
  deprecationsFactory: DeprecationsFactory;
  configService: IConfigService;
}

export const registerConfigDeprecationsInfo = ({
  deprecationsFactory,
  configService,
}: RegisterConfigDeprecationsInfo) => {
  const handledDeprecatedConfigs = configService.getHandledDeprecatedConfigs();

  for (const [domainId, deprecationsContexts] of handledDeprecatedConfigs) {
    const deprecationsRegistry = deprecationsFactory.getRegistry(domainId);
    deprecationsRegistry.registerDeprecations({
      getDeprecations: () => {
        return deprecationsContexts.map(
          ({
            configPath,
            title = `${domainId} has a deprecated setting`,
            level,
            message,
            correctiveActions,
            documentationUrl,
          }) => ({
            configPath,
            title,
            level,
            message,
            correctiveActions,
            documentationUrl,
            deprecationType: 'config',
            requireRestart: true,
          })
        );
      },
    });
  }
};
