/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { UnifiedSearchPublicPluginStart } from 'src/plugins/unified_search/public';
import { TopNavMenuProps, TopNavMenu } from './top_nav_menu';
import { RegisteredTopNavMenuData } from './top_nav_menu_data';

export function createTopNav(
  unifiedSearch: UnifiedSearchPublicPluginStart,
  extraConfig: RegisteredTopNavMenuData[]
) {
  return (props: TopNavMenuProps) => {
    const relevantConfig = extraConfig.filter(
      (dataItem) => dataItem.appName === undefined || dataItem.appName === props.appName
    );
    const config = (props.config || []).concat(relevantConfig);

    return (
      <I18nProvider>
        <TopNavMenu {...props} unifiedSearch={unifiedSearch} config={config} />
      </I18nProvider>
    );
  };
}
