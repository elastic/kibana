/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiTabs, EuiTab, EuiTourStep, EuiTourStepProps } from '@elastic/eui';

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
  tourStepProps: EuiTourStepProps[];
}

export const TopNavMenu: FunctionComponent<Props> = ({ items, disabled, tourStepProps }) => {
  return (
    <EuiTabs size="s">
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
          const tourProps = tourStepProps[item.tourStep - 1];
          const { step, isStepOpen, onFinish, title, content, stepsTotal, footerAction } = tourProps;

          return (
            <EuiTourStep
              step={step}
              isStepOpen={isStepOpen}
              title={title}
              content={content}
              stepsTotal={stepsTotal}
              onFinish={() => onFinish()}
              footerAction={footerAction}
            >
              {tab}
            </EuiTourStep>
          );
        }

        return tab;
      })}
    </EuiTabs>
  );
};
