/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FieldFormatEditorFactory } from '../types';
import { formatId } from './constants';
import { DurationFormatEditorFormatParams } from './duration';

export type { DurationFormatEditor } from './duration';
export const durationFormatEditorFactory: FieldFormatEditorFactory<
  DurationFormatEditorFormatParams
> = () => import('./duration').then((m) => m.DurationFormatEditor);
durationFormatEditorFactory.formatId = formatId;
