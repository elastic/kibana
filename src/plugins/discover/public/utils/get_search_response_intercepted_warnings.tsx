/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { uniqBy } from 'lodash';
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
  if (!options?.disableShardFailureWarning) {
    return undefined;
  }

  const interceptedWarnings: SearchResponseInterceptedWarning[] = [];

  services.data.search.showWarnings?.(adapter, (warning, meta) => {
    const { request, response } = meta;

    interceptedWarnings.push({
      originalWarning: warning,
      action:
        warning.type === 'shard_failure' && warning.text && warning.message ? (
          <ShardFailureOpenModalButton
            theme={services.theme}
            title={warning.message}
            size="s"
            getRequestMeta={() => ({
              request: request as ShardFailureRequest,
              response,
            })}
            color="primary"
            isButtonEmpty={true}
          />
        ) : undefined,
    });
    return true; // suppress the default behaviour
  });

  return removeInterceptedWarningDuplicates(interceptedWarnings);
};

export const removeInterceptedWarningDuplicates = (
  interceptedWarnings: SearchResponseInterceptedWarning[] | undefined
): SearchResponseInterceptedWarning[] | undefined => {
  if (!interceptedWarnings?.length) {
    return undefined;
  }

  const uniqInterceptedWarnings = uniqBy(interceptedWarnings, (interceptedWarning) =>
    JSON.stringify(interceptedWarning.originalWarning)
  );

  return uniqInterceptedWarnings?.length ? uniqInterceptedWarnings : undefined;
};
