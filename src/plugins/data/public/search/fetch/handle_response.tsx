/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { debounce } from 'lodash';
import { ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { IKibanaSearchResponse } from '../../../common';
import { ShardFailureOpenModalButton } from '../../shard_failure_modal';
import { getNotifications, getUiSettings } from '../../services';
import type { SearchRequest } from '..';
import { UI_SETTINGS } from '../..';

export function handleResponse(
  request: SearchRequest,
  response: IKibanaSearchResponse,
  theme: ThemeServiceStart
) {
  const searchTimeout = getUiSettings().get<number>(UI_SETTINGS.SEARCH_TIMEOUT);

  const debouncedShardsToast = debounce(
    getNotifications().toasts.addWarning,
    searchTimeout + 5000,
    {
      leading: true,
    }
  );

  const { rawResponse } = response;

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
        <ShardFailureOpenModalButton
          request={request.body}
          response={rawResponse}
          theme={theme}
          title={title}
        />
      </>,
      { theme$: theme.theme$ }
    );

    debouncedShardsToast({ title, text });
  }

  return response;
}
