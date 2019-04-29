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

import _ from 'lodash';

const getRootCause = err => _.get(err, 'resp.error.root_cause');

/**
 * Utilize the extended error information returned from elasticsearch
 * @param  {Error|String} err
 * @returns {string}
 */
export const formatESMsg = (err) => {
  const rootCause = getRootCause(err);

  if (!rootCause) {
    return;
  }

  const result = _.pluck(rootCause, 'reason').join('\n');
  return result;
};
