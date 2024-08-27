/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiTabs, EuiTab } from '@elastic/eui';
import { ConsoleTourStep, ConsoleTourStepProps } from './console_tour_step';

export interface TopNavMenuItem {
  id: string;
  label: string;
  description: string;
  onClick: () => void;
  testId: string;
  isSelected: boolean;
  tourStep?: number;
}

interface Props {
  disabled?: boolean;
  items: TopNavMenuItem[];
  tourStepProps: ConsoleTourStepProps[];
}

export const TopNavMenu: FunctionComponent<Props> = ({ items, disabled, tourStepProps }) => {
  return (
    <EuiTabs size="s" bottomBorder={false}>
      {items.map((item, idx) => {
        const tab = (
          <EuiTab
            key={idx}
            disabled={disabled}
            onClick={item.onClick}
            title={item.label}
            data-test-subj={item.testId}
            isSelected={item.isSelected}
          >
            {item.label}
          </EuiTab>
        );

        if (item.tourStep) {
          return (
            <ConsoleTourStep tourStepProps={tourStepProps[item.tourStep - 1]}>
              {tab}
            </ConsoleTourStep>
          );
        }

        return tab;
      })}
    </EuiTabs>
  );
};
