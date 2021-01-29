/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';

import { OptionTab } from './use_option_tabs';

interface DefaultEditorNavBarProps {
  optionTabs: OptionTab[];
  setSelectedTab(name: string): void;
}

function DefaultEditorNavBar({ setSelectedTab, optionTabs }: DefaultEditorNavBarProps) {
  return (
    <EuiTabs className="visEditorSidebar__nav" size="s">
      {optionTabs.map(({ name, title, isSelected = false }) => (
        <EuiTab
          key={name}
          isSelected={isSelected}
          data-test-subj={`visEditorTab__${name}`}
          onClick={() => setSelectedTab(name)}
        >
          {title}
        </EuiTab>
      ))}
    </EuiTabs>
  );
}

export { DefaultEditorNavBar };
