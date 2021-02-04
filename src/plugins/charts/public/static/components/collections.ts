/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { i18n } from '@kbn/i18n';

export const ColorMode = Object.freeze({
  Background: 'Background' as 'Background',
  Labels: 'Labels' as 'Labels',
  None: 'None' as 'None',
});
export type ColorMode = $Values<typeof ColorMode>;

export const LabelRotation = Object.freeze({
  Horizontal: 0,
  Vertical: 90,
  Angled: 75,
});
export type LabelRotation = $Values<typeof LabelRotation>;

export const defaultCountLabel = i18n.translate('charts.countText', {
  defaultMessage: 'Count',
});
