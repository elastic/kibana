/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiTab } from '@elastic/eui';

export const DATA_TEST_SUBJ_PREFIX_TAB = 'settings-tab';

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
}

/**
 * Component for rendering a settings tab.
 */
export const Tab = ({ id, name, onChangeSelectedTab, isSelected }: TabProps) => {
  return (
    <EuiTab
      data-test-subj={`${DATA_TEST_SUBJ_PREFIX_TAB}-${id}`}
      onClick={() => onChangeSelectedTab()}
      isSelected={isSelected}
    >
      {name}
    </EuiTab>
  );
};
