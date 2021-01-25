/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SerializedFieldFormat } from '../../../../expressions/common/types';
import { IFieldFormat } from '../index';

export { asPrettyString } from './as_pretty_string';
export { getHighlightHtml, getHighlightRequest } from './highlight';

export type FormatFactory = (mapping?: SerializedFieldFormat) => IFieldFormat;
