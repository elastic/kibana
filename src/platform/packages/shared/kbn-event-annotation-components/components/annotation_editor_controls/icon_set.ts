/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { IconSet } from '@kbn/visualization-ui-components';
import {
  annotationReferenceLineSharedSetOfIcons,
  iconSortCriteria,
} from '@kbn/visualization-ui-components';
import type { AvailableAnnotationIcon } from '@kbn/event-annotation-common';

export const annotationsIconSet: IconSet<AvailableAnnotationIcon> = [
  ...annotationReferenceLineSharedSetOfIcons,
].sort(iconSortCriteria);
