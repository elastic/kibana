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

import moment from 'moment';

import { i18n } from '@kbn/i18n';

export class SearchRequest {
  constructor({ source, errorHandler }) {
    if (!errorHandler) {
      throw new Error(
        i18n.translate('common.ui.courier.fetch.requireErrorHandlerErrorMessage', {
          defaultMessage: '{errorHandler} is required',
          values: { errorHandler: 'errorHandler' }
        })
      );
    }

    this._promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });

    this.errorHandler = errorHandler;
    this.source = source;

    // Track execution time.
    this.moment = undefined;
    this.ms = undefined;
  }

  start() {
    this.moment = moment();
    return this.source.requestIsStarting(this);
  }

  getFetchParams() {
    return this.source._flatten();
  }

  handleResponse(resp) {
    this.success = true;
    this.resp = resp;
  }

  handleFailure(error) {
    this.success = false;
    this.resp = error;
    this.resp = (error && error.resp) || error;
    return this.errorHandler(this, error);
  }

  abort() {
    this.aborted = true;
  }

  complete() {
    this.ms = this.moment.diff() * -1;
    this.resolve(this.resp);
  }

  getCompletePromise() {
    return this._promise;
  }
}
