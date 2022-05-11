/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { TriangleIcon, CircleIcon } from '../icons';
import { AvailableReferenceLineIcons } from '../../common/constants';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export const iconSet = [
  {
    value: AvailableReferenceLineIcons.EMPTY,
    label: i18n.translate('expressionXY.xyChart.iconSelect.noIconLabel', {
      defaultMessage: 'None',
    }),
  },
  {
    value: AvailableReferenceLineIcons.ASTERISK,
    label: i18n.translate('expressionXY.xyChart.iconSelect.asteriskIconLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: AvailableReferenceLineIcons.ALERT,
    label: i18n.translate('expressionXY.xyChart.iconSelect.alertIconLabel', {
      defaultMessage: 'Alert',
    }),
  },
  {
    value: AvailableReferenceLineIcons.BELL,
    label: i18n.translate('expressionXY.xyChart.iconSelect.bellIconLabel', {
      defaultMessage: 'Bell',
    }),
  },
  {
    value: AvailableReferenceLineIcons.BOLT,
    label: i18n.translate('expressionXY.xyChart.iconSelect.boltIconLabel', {
      defaultMessage: 'Bolt',
    }),
  },
  {
    value: AvailableReferenceLineIcons.BUG,
    label: i18n.translate('expressionXY.xyChart.iconSelect.bugIconLabel', {
      defaultMessage: 'Bug',
    }),
  },
  {
    value: AvailableReferenceLineIcons.CIRCLE,
    label: i18n.translate('expressionXY.xyChart.iconSelect.circleIconLabel', {
      defaultMessage: 'Circle',
    }),
    icon: CircleIcon,
    canFill: true,
  },

  {
    value: AvailableReferenceLineIcons.EDITOR_COMMENT,
    label: i18n.translate('expressionXY.xyChart.iconSelect.commentIconLabel', {
      defaultMessage: 'Comment',
    }),
  },
  {
    value: AvailableReferenceLineIcons.FLAG,
    label: i18n.translate('expressionXY.xyChart.iconSelect.flagIconLabel', {
      defaultMessage: 'Flag',
    }),
  },
  {
    value: AvailableReferenceLineIcons.HEART,
    label: i18n.translate('expressionXY.xyChart.iconSelect.heartLabel', {
      defaultMessage: 'Heart',
    }),
  },
  {
    value: AvailableReferenceLineIcons.MAP_MARKER,
    label: i18n.translate('expressionXY.xyChart.iconSelect.mapMarkerLabel', {
      defaultMessage: 'Map Marker',
    }),
  },
  {
    value: AvailableReferenceLineIcons.PIN_FILLED,
    label: i18n.translate('expressionXY.xyChart.iconSelect.mapPinLabel', {
      defaultMessage: 'Map Pin',
    }),
  },
  {
    value: AvailableReferenceLineIcons.STAR_EMPTY,
    label: i18n.translate('expressionXY.xyChart.iconSelect.starLabel', { defaultMessage: 'Star' }),
  },
  {
    value: AvailableReferenceLineIcons.TAG,
    label: i18n.translate('expressionXY.xyChart.iconSelect.tagIconLabel', {
      defaultMessage: 'Tag',
    }),
  },
  {
    value: AvailableReferenceLineIcons.TRIANGLE,
    label: i18n.translate('expressionXY.xyChart.iconSelect.triangleIconLabel', {
      defaultMessage: 'Triangle',
    }),
    icon: TriangleIcon,
    shouldRotate: true,
    canFill: true,
  },
];
