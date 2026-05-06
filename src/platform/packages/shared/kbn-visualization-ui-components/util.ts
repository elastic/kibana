/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { isNestedField } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import { IconCircle, IconTriangle } from '@kbn/chart-icons';
import type { IconSet } from './components';
import type { AnnotationReferenceLineIcons, SharedSetOfIcons } from './types';

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

export const emptyIconEntry: IconSet<'empty'>[number] = {
  value: 'empty',
  label: i18n.translate('visualizationUiComponents.iconSelect.noIconLabel', {
    defaultMessage: 'None',
  }),
};

/**
 * Intersection of icons shared across Reference Lines, Annotations, and Metric charts.
 * Each consumer extends this base with its own additional icons.
 */
export const sharedSetOfIcons: IconSet<SharedSetOfIcons> = [
  {
    value: 'asterisk',
    label: i18n.translate('visualizationUiComponents.iconSelect.asteriskIconLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: 'alert',
    label: i18n.translate('visualizationUiComponents.iconSelect.alertIconLabel', {
      defaultMessage: 'Alert',
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
    value: 'flag',
    label: i18n.translate('visualizationUiComponents.iconSelect.flagIconLabel', {
      defaultMessage: 'Flag',
    }),
  },
  {
    value: 'heart',
    label: i18n.translate('visualizationUiComponents.iconSelect.heartIconLabel', {
      defaultMessage: 'Heart',
    }),
  },
  {
    value: 'mapMarker',
    label: i18n.translate('visualizationUiComponents.iconSelect.mapMarkerIconLabel', {
      defaultMessage: 'Map Marker',
    }),
  },
  {
    value: 'starEmpty',
    label: i18n.translate('visualizationUiComponents.iconSelect.starIconLabel', {
      defaultMessage: 'Star',
    }),
  },
  {
    value: 'tag',
    label: i18n.translate('visualizationUiComponents.iconSelect.tagIconLabel', {
      defaultMessage: 'Tag',
    }),
  },
];

export const annotationReferenceLineSharedSetOfIcons: IconSet<AnnotationReferenceLineIcons> = [
  ...sharedSetOfIcons,
  {
    value: 'circle',
    label: i18n.translate(
      'visualizationUiComponents.annotationReferenceLine.iconSelect.circleIconLabel',
      {
        defaultMessage: 'Circle',
      }
    ),
    icon: IconCircle,
  },
  {
    value: 'pinFilled',
    label: i18n.translate(
      'visualizationUiComponents.annotationReferenceLine.iconSelect.mapPinLabel',
      {
        defaultMessage: 'Map Pin',
      }
    ),
  },
  {
    value: 'starFilled',
    label: i18n.translate(
      'visualizationUiComponents.annotationReferenceLine.iconSelect.starFilledLabel',
      {
        defaultMessage: 'Star filled',
      }
    ),
  },
  {
    value: 'triangle',
    label: i18n.translate(
      'visualizationUiComponents.annotationReferenceLine.iconSelect.triangleIconLabel',
      {
        defaultMessage: 'Triangle',
      }
    ),
    icon: IconTriangle,
    shouldRotate: true,
  },
];
