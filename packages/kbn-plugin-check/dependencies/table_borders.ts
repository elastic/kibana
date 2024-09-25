/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CharName } from 'cli-table3';

type Borders = Record<string, Partial<Record<CharName, string>>>;

/**
 * A utility collection of table border settings for use with `cli-table3`.
 */
export const borders: Borders = {
  table: {
    'bottom-left': '╚',
    'bottom-right': '╝',
    'left-mid': '╟',
    'right-mid': '╢',
    'top-left': '╔',
    'top-right': '╗',
    left: '║',
    right: '║',
  },
  header: {
    'bottom-left': '╚',
    'bottom-mid': '╤',
    'bottom-right': '╝',
    'mid-mid': '╪',
    'top-mid': '╤',
    bottom: '═',
    mid: '═',
    top: '═',
  },
  subheader: {
    'left-mid': '╠',
    'mid-mid': '╪',
    'right-mid': '╣',
    'top-left': '╠',
    'top-mid': '╤',
    'top-right': '╣',
    bottom: '═',
    mid: '═',
    top: '╤',
  },
  lastDependency: {
    'bottom-left': '╚',
    'bottom-mid': '═',
    'bottom-right': '╝',
    bottom: '═',
  },
  footer: {
    'bottom-left': '╚',
    'bottom-mid': '╧',
    'bottom-right': '╝',
    'left-mid': '╠',
    'mid-mid': '═',
    'right-mid': '╣',
    'top-left': '╠',
    'top-mid': '╤',
    'top-right': '╣',
    bottom: '═',
    left: '║',
    mid: '═',
    middle: '═',
    right: '║',
    top: '═',
  },
};
