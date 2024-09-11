/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField, isNestedField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import type { IconSet } from './components';
import type { SharedSetOfIcons } from './types';

export const isFieldLensCompatible = (field: DataViewField) =>
  !isNestedField(field) && (!!field.aggregatable || !!field.scripted);

/**
 * Icon checking logic. It makes sure an icon has actual content.
 */
export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

/**
 * Sorting criteria for icons sets. It makes sure empty icon is always on top.
 */
export function iconSortCriteria<T extends string>(a: IconSet<T>[number], b: IconSet<T>[number]) {
  if (a.value === 'empty') {
    return -1;
  }
  if (b.value === 'empty') {
    return 1;
  }
  return a.value.localeCompare(b.value);
}

/**
 * This is the minimal icons set.
 * So far it is computed from Reference line and Metric chart icons.
 * Needs to consider annotation icons set too in the future.
 */

export const sharedSetOfIcons: IconSet<SharedSetOfIcons> = [
  {
    value: 'empty',
    label: i18n.translate('visualizationUiComponents.iconSelect.noIconLabel', {
      defaultMessage: 'None',
    }),
  },
  {
    value: 'asterisk',
    label: i18n.translate('visualizationUiComponents.iconSelect.asteriskIconLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: 'bell',
    label: i18n.translate('visualizationUiComponents.iconSelect.bellIconLabel', {
      defaultMessage: 'Bell',
    }),
  },
  {
    value: 'bolt',
    label: i18n.translate('visualizationUiComponents.iconSelect.boltIconLabel', {
      defaultMessage: 'Bolt',
    }),
  },
  {
    value: 'bug',
    label: i18n.translate('visualizationUiComponents.iconSelect.bugIconLabel', {
      defaultMessage: 'Bug',
    }),
  },
  {
    value: 'editorComment',
    label: i18n.translate('visualizationUiComponents.iconSelect.commentIconLabel', {
      defaultMessage: 'Comment',
    }),
  },
  {
    value: 'alert',
    label: i18n.translate('visualizationUiComponents.iconSelect.alertIconLabel', {
      defaultMessage: 'Alert',
    }),
  },
  {
    value: 'flag',
    label: i18n.translate('visualizationUiComponents.iconSelect.flagIconLabel', {
      defaultMessage: 'Flag',
    }),
  },
  {
    value: 'tag',
    label: i18n.translate('visualizationUiComponents.iconSelect.tagIconLabel', {
      defaultMessage: 'Tag',
    }),
  },
];
