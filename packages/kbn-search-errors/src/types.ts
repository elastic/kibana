/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import type { ConnectionRequestParams } from '@elastic/transport';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/common';

type SanitizedConnectionRequestParams = Pick<
  ConnectionRequestParams,
  'method' | 'path' | 'querystring'
>;

interface IEsErrorAttributes {
  error?: estypes.ErrorCause;
  rawResponse?: estypes.SearchResponseBody;
  requestParams?: SanitizedConnectionRequestParams;
}

export type IEsError = KibanaServerError<IEsErrorAttributes>;
