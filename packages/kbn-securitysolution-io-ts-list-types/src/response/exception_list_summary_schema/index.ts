/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { _versionOrUndefined } from '../../common/underscore_version';

export const exceptionListSummarySchema = t.exact(
  t.type({
    windows: t.number,
    linux: t.number,
    macos: t.number,
    total: t.number,
  })
);

export type ExceptionListSummarySchema = t.TypeOf<typeof exceptionListSummarySchema>;
