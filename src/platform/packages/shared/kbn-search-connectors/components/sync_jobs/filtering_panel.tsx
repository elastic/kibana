/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiCodeBlock, EuiPanel, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FilteringRule, FilteringRules } from '../..';

import { FilteringRulesTable } from './filtering_rules_table';

import { FlyoutPanel } from './flyout_panel';

interface FilteringPanelProps {
  advancedSnippet?: FilteringRules['advanced_snippet'];
  filteringRules: FilteringRule[];
}

export const FilteringPanel: React.FC<FilteringPanelProps> = ({
  advancedSnippet,
  filteringRules,
}) => {
  return (
    <>
      <FlyoutPanel
        title={i18n.translate('searchConnectors.index.syncJobs.syncRulesTitle', {
          defaultMessage: 'Sync rules',
        })}
      >
        <FilteringRulesTable filteringRules={filteringRules} showOrder={false} />
      </FlyoutPanel>
      {!!advancedSnippet?.value ? (
        <>
          <EuiSpacer />
          <FlyoutPanel
            title={i18n.translate('searchConnectors.index.syncJobs.syncRulesAdvancedTitle', {
              defaultMessage: 'Advanced sync rules',
            })}
          >
            <EuiPanel hasShadow={false}>
              <EuiCodeBlock transparentBackground language="json">
                {JSON.stringify(advancedSnippet.value, undefined, 2)}
              </EuiCodeBlock>
            </EuiPanel>
          </FlyoutPanel>
        </>
      ) : (
        <></>
      )}
    </>
  );
};
