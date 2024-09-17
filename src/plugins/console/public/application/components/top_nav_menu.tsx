/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';

export interface TopNavMenuItem {
  id: string;
  label: string;
  description: string;
  onClick: () => void;
  testId: string;
}

interface Props {
  disabled?: boolean;
  items: TopNavMenuItem[];
}

export const TopNavMenu: FunctionComponent<Props> = ({ items, disabled }) => {
  return (
    <EuiTabs size="s">
      {items.map((item, idx) => {
        return (
          <EuiTab
            key={idx}
            disabled={disabled}
            onClick={item.onClick}
            title={item.label}
            data-test-subj={item.testId}
          >
            {item.label}
          </EuiTab>
        );
      })}
    </EuiTabs>
  );
};
