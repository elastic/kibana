/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook } from '@kbn/scout';
import { DISCOVER_KBN_ARCHIVE } from '../fixtures/constants';

globalTeardownHook(
  'Unload discover archives for discover_customization_examples',
  async ({ kbnClient, log }) => {
    log.debug('[teardown:discover_customization_examples] unsetting defaultIndex...');
    await kbnClient.uiSettings.unset('defaultIndex');
    log.debug('[teardown:discover_customization_examples] unloading discover saved objects...');
    await kbnClient.importExport.unload(DISCOVER_KBN_ARCHIVE);
  }
);
