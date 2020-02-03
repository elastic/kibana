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

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { ShardFailureOpenModalButton, ShardFailureRequest, ShardFailureResponse } from '../../ui';
import { toMountPoint } from '../../../../kibana_react/public';
import { getNotifications } from '../../services';
import { SearchRequest, SearchResponse } from '..';

export function handleResponse(request: SearchRequest, response: SearchResponse) {
  if (response.timed_out) {
    getNotifications().toasts.addWarning({
      title: i18n.translate('data.search.searchSource.fetch.requestTimedOutNotificationMessage', {
        defaultMessage: 'Data might be incomplete because your request timed out',
      }),
    });
  }

  if (response._shards && response._shards.failed) {
    const title = i18n.translate('data.search.searchSource.fetch.shardsFailedNotificationMessage', {
      defaultMessage: '{shardsFailed} of {shardsTotal} shards failed',
      values: {
        shardsFailed: response._shards.failed,
        shardsTotal: response._shards.total,
      },
    });
    const description = i18n.translate(
      'data.search.searchSource.fetch.shardsFailedNotificationDescription',
      {
        defaultMessage: 'The data you are seeing might be incomplete or wrong.',
      }
    );

    const text = toMountPoint(
      <>
        {description}
        <EuiSpacer size="s" />
        <ShardFailureOpenModalButton
          request={request.body as ShardFailureRequest}
          response={response as ShardFailureResponse}
          title={title}
        />
      </>
    );

    getNotifications().toasts.addWarning({ title, text });
  }

  return response;
}
