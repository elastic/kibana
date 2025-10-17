/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import * as i18n from './translations';

export const validateAndNormalizeUrl = (
  configurationUtilities: ActionsConfigurationUtilities,
  url: string
): string => {
  try {
    configurationUtilities.ensureUriAllowed(url);
  } catch (allowListError) {
    throw new Error(i18n.INVALID_URL(url, allowListError.message));
  }

  return url;
};

export const removeSlash = (url: string) => (url.endsWith('/') ? url.slice(0, -1) : url);
