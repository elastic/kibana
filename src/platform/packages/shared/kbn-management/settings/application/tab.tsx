/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLoadingSpinner, EuiTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DATA_TEST_SUBJ_PREFIX_TAB = 'settings-tab';
export const DATA_TEST_SUBJ_TAB_LOADING = 'settings-tab-loading';

/**
 * Props for a {@link Tab} component.
 */
export interface TabProps {
  /** The id of the tab. Used by parent component for differentiating between tabs. */
  id: string;
  /** The name of the tab. */
  name: string;
  /** The `onClick` handler for the tab. */
  onChangeSelectedTab: () => void;
  /** True if the tab is selected, false otherwise. */
  isSelected: boolean;
  /** True if the tab's settings are loading, which disables the tab. */
  isLoading?: boolean;
}

/**
 * Component for rendering a settings tab.
 */
export const Tab = ({ id, name, onChangeSelectedTab, isSelected, isLoading }: TabProps) => {
  return (
    <EuiTab
      data-test-subj={`${DATA_TEST_SUBJ_PREFIX_TAB}-${id}`}
      onClick={() => onChangeSelectedTab()}
      isSelected={isSelected}
      disabled={isLoading}
      append={
        isLoading && (
          <EuiLoadingSpinner
            size="s"
            data-test-subj={DATA_TEST_SUBJ_TAB_LOADING}
            aria-label={i18n.translate('management.settings.tabLoadingLabel', {
              defaultMessage: 'Loading {name}',
              values: { name },
            })}
          />
        )
      }
    >
      {name}
    </EuiTab>
  );
};
