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

import { toastNotifications } from '../../notify';
import { RequestFailure } from '../../errors';
import { SearchError } from '../search_strategy/search_error';
import { i18n } from '@kbn/i18n';

export function callResponseHandlers(searchRequests, responses) {
  return Promise.all(searchRequests.map((searchRequest, index) => {
    const response = responses[index];

    if (response.timed_out) {
      toastNotifications.addWarning({
        title: i18n.translate('common.ui.courier.fetch.requestTimedOutNotificationMessage', {
          defaultMessage: 'Data might be incomplete because your request timed out',
        })
      });
    }

    if (response._shards && response._shards.failed) {
      toastNotifications.addWarning({
        title: i18n.translate('common.ui.courier.fetch.shardsFailedNotificationMessage', {
          defaultMessage: '{shardsFailed} of {shardsTotal} shards failed',
          values: { shardsFailed: response._shards.failed, shardsTotal: response._shards.total }
        })
      });
    }

    if (response.error) {
      return searchRequest.handleFailure(response.error instanceof SearchError ? response.error : new RequestFailure(null, response));
    }

    return searchRequest.handleResponse(response);
  }));
}
