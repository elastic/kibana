/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { type DataPublicPluginStart, ViewWarningButton } from '@kbn/data-plugin/public';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
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
  };
  adapter: RequestAdapter;
}): SearchResponseInterceptedWarning[] => {
  const interceptedWarnings: SearchResponseInterceptedWarning[] = [];

  services.data.search.showWarnings(adapter, (warning) => {
    interceptedWarnings.push({
      originalWarning: warning,
      action:
        warning.type === 'incomplete' ? (
          <ViewWarningButton
            color="primary"
            size="s"
            onClick={warning.openInInspector}
            isButtonEmpty={true}
          />
        ) : undefined,
    });
    return true; // suppress the default behaviour
  });

  return interceptedWarnings;
};
