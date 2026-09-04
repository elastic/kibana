/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { DISCOVER_KBN_ARCHIVE, LOGSTASH_FUNCTIONAL_ARCHIVE } from '../fixtures/constants';

globalSetupHook(
  'Load logstash + discover archives for discover_customization_examples',
  async ({ esArchiver, kbnClient, log }) => {
    log.debug('[setup:discover_customization_examples] loading logstash_functional (if needed)...');
    await esArchiver.loadIfNeeded(LOGSTASH_FUNCTIONAL_ARCHIVE);
    log.debug('[setup:discover_customization_examples] loading discover saved objects...');
    await kbnClient.importExport.load(DISCOVER_KBN_ARCHIVE);
    log.debug('[setup:discover_customization_examples] setting defaultIndex...');
    await kbnClient.uiSettings.update({ defaultIndex: 'logstash-*' });
  }
);
