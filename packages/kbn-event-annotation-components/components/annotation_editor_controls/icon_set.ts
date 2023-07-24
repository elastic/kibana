/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IconTriangle, IconCircle } from '@kbn/chart-icons';
import type { IconSet } from '@kbn/visualization-ui-components';
import type { AvailableAnnotationIcon } from '@kbn/event-annotation-common';

export const annotationsIconSet: IconSet<AvailableAnnotationIcon> = [
  {
    value: 'asterisk',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.asteriskIconLabel', {
      defaultMessage: 'Asterisk',
    }),
  },
  {
    value: 'alert',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.alertIconLabel', {
      defaultMessage: 'Alert',
    }),
  },
  {
    value: 'bell',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.bellIconLabel', {
      defaultMessage: 'Bell',
    }),
  },
  {
    value: 'bolt',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.boltIconLabel', {
      defaultMessage: 'Bolt',
    }),
  },
  {
    value: 'bug',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.bugIconLabel', {
      defaultMessage: 'Bug',
    }),
  },
  {
    value: 'circle',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.circleIconLabel', {
      defaultMessage: 'Circle',
    }),
    icon: IconCircle,
  },

  {
    value: 'editorComment',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.commentIconLabel', {
      defaultMessage: 'Comment',
    }),
  },
  {
    value: 'flag',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.flagIconLabel', {
      defaultMessage: 'Flag',
    }),
  },
  {
    value: 'heart',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.heartLabel', {
      defaultMessage: 'Heart',
    }),
  },
  {
    value: 'mapMarker',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.mapMarkerLabel', {
      defaultMessage: 'Map Marker',
    }),
  },
  {
    value: 'pinFilled',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.mapPinLabel', {
      defaultMessage: 'Map Pin',
    }),
  },
  {
    value: 'starEmpty',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.starLabel', {
      defaultMessage: 'Star',
    }),
  },
  {
    value: 'starFilled',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.starFilledLabel', {
      defaultMessage: 'Star filled',
    }),
  },
  {
    value: 'tag',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.tagIconLabel', {
      defaultMessage: 'Tag',
    }),
  },
  {
    value: 'triangle',
    label: i18n.translate('eventAnnotationComponents.xyChart.iconSelect.triangleIconLabel', {
      defaultMessage: 'Triangle',
    }),
    icon: IconTriangle,
    shouldRotate: true,
  },
];
