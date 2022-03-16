/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type IconPosition = 'auto' | 'left' | 'right' | 'above' | 'below';
export type AnnotationType = 'manual';
export type KeyType = 'point_in_time';
export type YAxisMode = 'auto' | 'bottom' | 'left' | 'right';

export interface AnnotationConfig {
  id: string;
  key: AnnotationKeyResult;
  annotationType: AnnotationType;
  label: string;
  message?: string;
  color?: string;
  icon?: string;
  lineWidth?: number;
  lineStyle?: LineStyle;
  iconPosition?: IconPosition;
  textVisibility?: boolean;
  isHidden?: boolean;
  axisMode: YAxisMode;
}

export type AnnotationResult = AnnotationConfig & { type: 'annotation_config' };

export interface AnnotationKey {
  keyType: KeyType;
  timestamp: number;
}

export type AnnotationKeyResult = AnnotationKey & { type: 'annotation_key' };
