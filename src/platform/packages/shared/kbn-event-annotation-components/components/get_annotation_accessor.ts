/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AccessorConfig } from '@kbn/visualization-ui-components';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  isRangeAnnotationConfig,
} from '@kbn/event-annotation-common';
import { annotationsIconSet } from './annotation_editor_controls/icon_set';

export const getAnnotationAccessor = (annotation: EventAnnotationConfig): AccessorConfig => {
  const annotationIcon = !isRangeAnnotationConfig(annotation)
    ? annotationsIconSet.find((option) => option.value === annotation?.icon) ||
      annotationsIconSet.find((option) => option.value === 'triangle')
    : undefined;
  const icon = annotationIcon?.icon ?? annotationIcon?.value;
  return {
    columnId: annotation.id,
    triggerIconType: annotation.isHidden ? 'invisible' : icon ? 'custom' : 'color',
    customIcon: icon,
    color:
      annotation?.color ||
      (isRangeAnnotationConfig(annotation) ? defaultAnnotationRangeColor : defaultAnnotationColor),
  };
};
