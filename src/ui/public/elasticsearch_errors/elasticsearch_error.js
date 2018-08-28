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

export class ElasticsearchError {
  constructor(error) {
    this.error = error;

    this.getRootCauses = this.getRootCauses.bind(this);
    this.hasRootCause = this.hasRootCause.bind(this);

    if (!this.getRootCauses().length) {
      throw new Error(
        'ElasticsearchError must be instantiated with an elasticsearch error, i.e. it must have' +
        `a resp.error.root_cause property. Instead got ${JSON.stringify(error)}`
      );
    }
  }

  static hasRootCause(error, cause) {
    try {
      const esError = new ElasticsearchError(error);
      return esError.hasRootCause(cause);
    } catch (err) {
      // we assume that any failure represents a validation error
      // in the ElasticsearchError constructor
      return false;
    }
  }

  getRootCauses() {
    const rootCauses = _.get(this.error, 'resp.error.root_cause');
    return _.pluck(rootCauses, 'reason');
  }

  hasRootCause(cause) {
    const normalizedCause = cause.toLowerCase();
    const rootCauses = this.getRootCauses();
    const matchingCauses = rootCauses.filter(rootCause => {
      const normalizedRootCause = rootCause.toLowerCase();
      return normalizedRootCause.indexOf(normalizedCause) !== -1;
    });
    return matchingCauses.length !== 0;
  }
}
