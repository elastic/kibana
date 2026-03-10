/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const HORIZONTAL_ALIGN = ['left', 'center', 'right'] as const;
const VERTICAL_ALIGN = ['top', 'bottom'] as const;
const LR_ALIGN = ['left', 'right'] as const;
const BEFORE_AFTER_ALIGN = ['before', 'after'] as const;

type Position = 'top' | 'bottom' | 'left' | 'right';

type HorizontalAlignment = (typeof HORIZONTAL_ALIGN)[number];
type VerticalAlignment = (typeof VERTICAL_ALIGN)[number];
type LeftRightAlignment = (typeof LR_ALIGN)[number];
type BeforeAfterAlignment = (typeof BEFORE_AFTER_ALIGN)[number];

interface Options<T extends string> {
  defaultValue?: T;
  meta?: { description: string };
}

export const horizontalAlignmentSchema = (opts?: Options<HorizontalAlignment>) =>
  schema.oneOf([schema.literal('left'), schema.literal('center'), schema.literal('right')], opts);

export const verticalAlignmentSchema = (opts?: Options<VerticalAlignment>) =>
  schema.oneOf([schema.literal('top'), schema.literal('bottom')], opts);

export const leftRightAlignmentSchema = (opts?: Options<LeftRightAlignment>) =>
  schema.oneOf([schema.literal('left'), schema.literal('right')], opts);

export const positionSchema = (opts?: Options<Position>) =>
  schema.oneOf(
    [
      schema.literal('top'),
      schema.literal('bottom'),
      schema.literal('left'),
      schema.literal('right'),
    ],
    opts
  );

export const beforeAfterAlignmentSchema = (opts?: Options<BeforeAfterAlignment>) =>
  schema.oneOf([schema.literal('before'), schema.literal('after')], opts);
