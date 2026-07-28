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
import type { ApplicationStart } from '@kbn/core/public';
import type { AbstractDataView } from '@kbn/data-views-plugin/common';
import type { IEsError } from './types';
import { EsError } from './es_error';
export declare class PainlessError extends EsError {
  private readonly applicationStart;
  private readonly painlessCause;
  private readonly dataView?;
  constructor(
    err: IEsError,
    openInInspector: () => void,
    painlessCause: estypes.ErrorCause,
    applicationStart: ApplicationStart,
    dataView?: AbstractDataView
  );
  getErrorMessage(): React.JSX.Element;
  getActions(): React.JSX.Element[];
}
