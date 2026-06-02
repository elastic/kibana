/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { estypes } from '@elastic/elasticsearch';
import type { CoreStart } from '@kbn/core/public';
import type { IEsError } from './types';
import { EsError } from './es_error';
export declare class TsdbError extends EsError {
  private readonly docLinks;
  constructor(
    err: IEsError,
    openInInspector: () => void,
    tsdbCause: estypes.ErrorCause,
    docLinks: CoreStart['docLinks']
  );
  getErrorMessage(): React.JSX.Element;
}
