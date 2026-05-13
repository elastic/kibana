/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const ALL_OPTION_VALUE = 'ALL_OPTION_VALUE';

export function getOptionLabel(value: string | undefined) {
  if (value === undefined || value === ALL_OPTION_VALUE) {
    return i18n.translate('xpack.apm.agentConfig.allOptionLabel', {
      defaultMessage: 'All',
    });
  }
  return value;
}

export function omitAllOption(value?: string) {
  return value === ALL_OPTION_VALUE ? undefined : value;
}

export const ALL_OPTION = {
  value: ALL_OPTION_VALUE,
  label: getOptionLabel(ALL_OPTION_VALUE),
};
