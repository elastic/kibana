/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from '@kbn/utility-types';
import { AvailableAnnotationIcons } from './constants';

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type AnnotationType = 'manual';
export type KeyType = 'point_in_time';
export type AvailableAnnotationIcon = $Values<typeof AvailableAnnotationIcons>;

export interface StyleProps {
  label: string;
  color?: string;
  icon?: AvailableAnnotationIcon;
  lineWidth?: number;
  lineStyle?: LineStyle;
  textVisibility?: boolean;
  isHidden?: boolean;
}

export type EventAnnotationConfig = {
  id: string;
  key: {
    type: KeyType;
    timestamp: string;
  };
} & StyleProps;
