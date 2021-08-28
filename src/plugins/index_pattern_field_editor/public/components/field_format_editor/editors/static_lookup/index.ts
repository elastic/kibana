/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldFormatEditorFactory } from '../types';
import { formatId } from './constants';

export type { StaticLookupFormatEditor } from './static_lookup';
export const staticLookupFormatEditorFactory: FieldFormatEditorFactory = () =>
  import('./static_lookup').then((m) => m.StaticLookupFormatEditor);
staticLookupFormatEditorFactory.formatId = formatId;
