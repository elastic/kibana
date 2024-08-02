/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { isEqual } from 'lodash';
import type { Query } from '@kbn/es-query';
import {
  type UnifiedSearchPublicPluginStart,
  QueryStringInput,
} from '@kbn/unified-search-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { useDebouncedValue } from '@kbn/visualization-utils';

export interface QueryInputServices {
  http: HttpStart;
  storage: IStorageWrapper;
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  uiSettings: IUiSettingsClient;
  notifications: NotificationsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  docLinks: DocLinksStart;
}

export const QueryInput = ({
  value,
  onChange,
  dataView,
  isInvalid,
  onSubmit,
  disableAutoFocus,
  ['data-test-subj']: dataTestSubj,
  placeholder,
  appName,
  services: { data, uiSettings, http, notifications, docLinks, storage, unifiedSearch, dataViews },
}: {
  value: Query;
  onChange: (input: Query) => void;
  dataView: string | { type: 'title' | 'id'; value: string };
  isInvalid: boolean;
  onSubmit: () => void;
  disableAutoFocus?: boolean;
  'data-test-subj'?: string;
  placeholder?: string;
  appName: string;
  services: QueryInputServices;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange });

  return (
    <QueryStringInput
      dataTestSubj={dataTestSubj ?? 'indexPattern-filters-queryStringInput'}
      size="s"
      disableAutoFocus={disableAutoFocus}
      isInvalid={isInvalid}
      bubbleSubmitEvent={false}
      indexPatterns={[dataView]}
      query={inputValue}
      onChange={(newQuery) => {
        if (!isEqual(newQuery, inputValue)) {
          handleInputChange(newQuery);
        }
      }}
      onSubmit={() => {
        if (inputValue.query) {
          onSubmit();
        }
      }}
      placeholder={
        placeholder ??
        (inputValue.language === 'kuery'
          ? i18n.translate('visualizationUiComponents.queryInput.queryPlaceholderKql', {
              defaultMessage: '{example}',
              values: { example: 'method : "GET" or status : "404"' },
            })
          : i18n.translate('visualizationUiComponents.queryInput.queryPlaceholderLucene', {
              defaultMessage: '{example}',
              values: { example: 'method:GET OR status:404' },
            }))
      }
      languageSwitcherPopoverAnchorPosition="rightDown"
      appName={appName}
      deps={{ unifiedSearch, notifications, http, docLinks, uiSettings, data, storage, dataViews }}
    />
  );
};
