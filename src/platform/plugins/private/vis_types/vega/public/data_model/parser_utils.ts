/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

// These values may appear in the  'url': { ... }  object
export const CONTEXT = '%context%';
export const TIMEFIELD = '%timefield%';

export const getRequestName = (name: string | undefined, index: number) =>
  name ??
  i18n.translate('visTypeVega.queryParser.unnamedRequest', {
    defaultMessage: 'Unnamed request #{index}',
    values: { index },
  });
