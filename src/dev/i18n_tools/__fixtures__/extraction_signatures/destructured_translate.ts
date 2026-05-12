/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const { translate } = i18n;

export const LABEL = translate('destructured.basic', {
  defaultMessage: 'Standalone translate is parsed!',
});

export const LABEL_WITH_VALUE = translate('destructured.with_value', {
  defaultMessage: 'Hello {name}!',
  values: { name: 'world' },
});
