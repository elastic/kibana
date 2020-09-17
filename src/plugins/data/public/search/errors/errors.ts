/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* eslint-disable max-classes-per-file */

import { get } from 'lodash';
import { HttpFetchError } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { KbnError } from '../../../../kibana_utils/common';
import { IEsSearchRequest } from '.';

/**
 * Class used to signify that a request timed out. Useful for applications to conditionally handle
 * this type of error differently than other errors.
 */
export class RequestTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.message = message;
    this.name = 'RequestTimeoutError';
  }
}

export enum TimeoutErrorMode {
  UPGRADE,
  CONTACT,
  CHANGE,
}

/**
 * Request Failure - When an entire multi request fails
 * @param {Error} err - the Error that came back
 */
export class SearchTimeoutError extends KbnError {
  public mode: TimeoutErrorMode;
  constructor(err: HttpFetchError | null = null, mode: TimeoutErrorMode) {
    super(`Request timeout: ${JSON.stringify(err?.message)}`);
    this.mode = mode;
  }
}

export class PainlessError extends KbnError {
  constructor(err: Error, request: IEsSearchRequest) {
    const rootCause = get(err, 'body.attributes.error.root_cause');
    const [{ script }] = rootCause;

    super(
      i18n.translate('discover.painlessError.painlessScriptedFieldErrorMessage', {
        defaultMessage: "Error with Painless scripted field '{script}'.",
        values: { script },
      })
    );
  }
}

export function isPainlessError(error: any) {
  const rootCause = get(error, 'body.attributes.error.root_cause');
  if (!rootCause) return false;

  const [{ lang }] = rootCause;
  return lang === 'painless';
}
