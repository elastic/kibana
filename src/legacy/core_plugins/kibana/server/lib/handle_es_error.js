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

import Boom from 'boom';
import _ from 'lodash';
import { errors as esErrors } from '@elastic/elasticsearch';

export default function handleESError(error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }


  function isResponseError (err, statusCode) {
    return err instanceof esErrors.ResponseError && err.statusCode === statusCode
  }

  if (error instanceof esErrors.ConnectionError ||
    isResponseError(error, 503) ||
    error instanceof esErrors.NoLivingConnectionsError ||
    error instanceof esErrors.TimeoutError) {
    return Boom.serverUnavailable(error);
  } else if (isResponseError(error, 409) || _.contains(error.message, 'index_template_already_exists')) {
    return Boom.conflict(error);
  } else if (isResponseError(error, 403)) {
    return Boom.forbidden(error);
  } else if (isResponseError(error, 404)) {
    return Boom.notFound(error);
  } else if (isResponseError(error, 400)) {
    return Boom.badRequest(error);
  } else {
    return error;
  }
}
