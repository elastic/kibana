/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { HELLO_WORLD_APP_ID, HELLO_WORLD_LAB_ID } from '../../common';
import type { LabDefinition } from '../types';

export const getLabDefinitions = (): readonly LabDefinition[] => [
  {
    id: HELLO_WORLD_LAB_ID,
    appId: HELLO_WORLD_APP_ID,
    order: 1,
    euiIconType: 'logoKibana',
    title: i18n.translate('labs.helloWorld.cardTitle', {
      defaultMessage: 'Hello world',
    }),
    description: i18n.translate('labs.helloWorld.cardDescription', {
      defaultMessage: 'A minimal experimental app that demonstrates the Labs install flow.',
    }),
    async mount({ coreStart, params, installedLabsService }) {
      const { renderApp } = await import('./hello_world/application');
      return renderApp({ coreStart, params, installedLabsService });
    },
  },
];
