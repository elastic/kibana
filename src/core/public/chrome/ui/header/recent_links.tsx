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
import { EuiNavDrawerGroup } from '@elastic/eui';
import { RecentNavLink } from './nav_link';

interface Props {
  recentNavLinks: RecentNavLink[];
}

export function RecentLinks({ recentNavLinks }: Props) {
  return (
    <EuiNavDrawerGroup
      listItems={[
        {
          label: i18n.translate('core.ui.chrome.sideGlobalNav.viewRecentItemsLabel', {
            defaultMessage: 'Recently viewed',
          }),
          iconType: 'recentlyViewedApp',
          isDisabled: recentNavLinks.length === 0,
          flyoutMenu: {
            title: i18n.translate('core.ui.chrome.sideGlobalNav.viewRecentItemsFlyoutTitle', {
              defaultMessage: 'Recent items',
            }),
            listItems: recentNavLinks,
          },
        },
      ]}
      aria-label={i18n.translate('core.ui.recentLinks.screenReaderLabel', {
        defaultMessage: 'Recently viewed links, navigation',
      })}
    />
  );
}
