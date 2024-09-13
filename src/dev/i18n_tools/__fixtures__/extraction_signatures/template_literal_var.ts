/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const e = new Error('Should not work');

i18n.translate('contains_variable', {
  defaultMessage: `value passed into literal directly (e: ${e.message})`,
});

i18n.translate('no_variable', {
  defaultMessage: `template literal without any variable expressions (e: {errorMessage})`,
  values: { errorMessage: e.message },
});
