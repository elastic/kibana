/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export type DimensionProperty = 'width' | 'height' | 'padding' | 'margin' | 'border-radius';

/** CSS dimension properties with i18n-translated labels for the dimensions editor. */
export const DIMENSION_PROPS: ReadonlyArray<{
  property: DimensionProperty;
  label: string;
}> = [
  {
    property: 'width',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.width', {
      defaultMessage: 'Width',
    }),
  },
  {
    property: 'height',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.height', {
      defaultMessage: 'Height',
    }),
  },
  {
    property: 'padding',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.padding', {
      defaultMessage: 'Padding',
    }),
  },
  {
    property: 'margin',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.margin', {
      defaultMessage: 'Margin',
    }),
  },
  {
    property: 'border-radius',
    label: i18n.translate('kbnDesignTools.edit.modal.dimensions.borderRadius', {
      defaultMessage: 'Border radius',
    }),
  },
];
