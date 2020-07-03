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
import { errors as esErrors } from 'elasticsearch';

export function handleESError(error) {
  if (!(error instanceof Error)) {
    throw new Error('Expected an instance of Error');
  }

  if (
    error instanceof esErrors.ConnectionFault ||
    error instanceof esErrors.ServiceUnavailable ||
    error instanceof esErrors.NoConnections ||
    error instanceof esErrors.RequestTimeout
  ) {
    return Boom.serverUnavailable(error);
  } else if (
    error instanceof esErrors.Conflict ||
    _.includes(error.message, 'index_template_already_exists')
  ) {
    return Boom.conflict(error);
  } else if (error instanceof esErrors[403]) {
    return Boom.forbidden(error);
  } else if (error instanceof esErrors.NotFound) {
    return Boom.notFound(error);
  } else if (error instanceof esErrors.BadRequest) {
    return Boom.badRequest(error);
  } else {
    return error;
  }
}
