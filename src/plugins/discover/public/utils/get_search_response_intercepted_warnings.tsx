/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ShardFailureOpenModalButton, ShardFailureRequest } from '@kbn/data-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { DiscoverServices } from '../build_services';
import type { SearchResponseInterceptedWarning } from '../types';

export const getSearchResponseInterceptedWarnings = ({
  services,
  adapter,
  options,
}: {
  services: Pick<DiscoverServices, 'data' | 'theme'>;
  adapter: RequestAdapter;
  options?: {
    disableShardFailureWarning?: boolean;
  };
}): SearchResponseInterceptedWarning[] | undefined => {
  const interceptedWarnings: SearchResponseInterceptedWarning[] = [];

  services.data.search.showWarnings(adapter, (warning, meta) => {
    const { request, response } = meta;
    if (options?.disableShardFailureWarning && warning.type === 'shard_failure') {
      interceptedWarnings.push({
        originalWarning: warning,
        action: (
          <ShardFailureOpenModalButton
            theme={services.theme}
            title={warning.message}
            size="m"
            getRequestMeta={() => ({
              request: request as ShardFailureRequest,
              response,
            })}
            color="primary"
            isButtonEmpty={true}
          />
        ),
      });
      return true; // suppress the default behaviour
    }
  });

  return interceptedWarnings.length ? interceptedWarnings : undefined;
};
