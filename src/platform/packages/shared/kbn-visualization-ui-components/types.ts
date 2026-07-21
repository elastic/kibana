/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;

export type LineStyle = 'solid' | 'dashed' | 'dotted';

// Intersection of icon names shared by Reference Lines, Annotations and Metric chart.
// Each consumer extends this base set with its own additional icons.
export type SharedSetOfIcons =
  | 'asterisk'
  | 'warning'
  | 'bell'
  | 'bolt'
  | 'bug'
  | 'comment'
  | 'flag'
  | 'heart'
  | 'waypoint'
  | 'star'
  | 'tag';

export type AnnotationReferenceLineIcons =
  | SharedSetOfIcons
  | 'circle'
  | 'pinFill'
  | 'starFill'
  | 'triangle';
