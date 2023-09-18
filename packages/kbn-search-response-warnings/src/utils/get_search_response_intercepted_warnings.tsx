/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  type DataPublicPluginStart,
  OpenIncompleteResultsModalButton,
} from '@kbn/data-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { SearchResponseInterceptedWarning } from '../types';

/**
 * Intercepts warnings for a search source request
 * @param services
 * @param adapter
 * @param options
 */
export const getSearchResponseInterceptedWarnings = ({
  services,
  adapter,
}: {
  services: {
    data: DataPublicPluginStart;
    theme: CoreStart['theme'];
  };
  adapter: RequestAdapter;
}): SearchResponseInterceptedWarning[] => {
  const interceptedWarnings: SearchResponseInterceptedWarning[] = [];

  services.data.search.showWarnings(adapter, (warning, meta) => {
    const { request, response } = meta;

    interceptedWarnings.push({
      originalWarning: warning,
      action:
        warning.type === 'incomplete' ? (
          <OpenIncompleteResultsModalButton
            theme={services.theme}
            warning={warning}
            size="s"
            getRequestMeta={() => ({
              request,
              response,
            })}
            color="primary"
            isButtonEmpty={true}
          />
        ) : undefined,
    });
    return true; // suppress the default behaviour
  });

  return interceptedWarnings;
};
