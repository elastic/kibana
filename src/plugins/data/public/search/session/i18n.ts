/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

/**
 * Message to display in case storing
 * session session is disabled due to turned off capability
 */
export const noSearchSessionStorageCapabilityMessage = i18n.translate(
  'data.searchSessionIndicator.noCapability',
  {
    defaultMessage: "You don't have permissions to create search sessions.",
  }
);
