/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { toMountPoint } from '../../../../kibana_react/public/util/to_mount_point';
import type { SearchRequest } from '../../../common/search/search_source/fetch/types';
import type { IKibanaSearchResponse } from '../../../common/search/types';
import { getNotifications } from '../../services';
import { ShardFailureOpenModalButton } from '../../ui/shard_failure_modal';

export function handleResponse(request: SearchRequest, response: IKibanaSearchResponse) {
  const { rawResponse, warning } = response;
  if (warning) {
    getNotifications().toasts.addWarning({
      title: i18n.translate('data.search.searchSource.fetch.warningMessage', {
        defaultMessage: 'Warning: {warning}',
        values: {
          warning,
        },
      }),
    });
  }

  if (rawResponse.timed_out) {
    getNotifications().toasts.addWarning({
      title: i18n.translate('data.search.searchSource.fetch.requestTimedOutNotificationMessage', {
        defaultMessage: 'Data might be incomplete because your request timed out',
      }),
    });
  }

  if (rawResponse._shards && rawResponse._shards.failed) {
    const title = i18n.translate('data.search.searchSource.fetch.shardsFailedNotificationMessage', {
      defaultMessage: '{shardsFailed} of {shardsTotal} shards failed',
      values: {
        shardsFailed: rawResponse._shards.failed,
        shardsTotal: rawResponse._shards.total,
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
        <ShardFailureOpenModalButton request={request.body} response={rawResponse} title={title} />
      </>
    );

    getNotifications().toasts.addWarning({ title, text });
  }

  return response;
}
