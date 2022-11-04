/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { $Values } from '@kbn/utility-types';

export const LabelRotation = Object.freeze({
  Horizontal: 0,
  Vertical: 90,
  Angled: 75,
});

export type LabelRotation = $Values<typeof LabelRotation>;

export const defaultCountLabel = i18n.translate('charts.countText', {
  defaultMessage: 'Count',
});
