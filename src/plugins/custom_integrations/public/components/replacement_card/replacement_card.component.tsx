/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiAccordion,
} from '@elastic/eui';
import { CustomIntegration } from '../../../common';

export interface Props {
  replacements: Array<Pick<CustomIntegration, 'id' | 'uiInternalPath' | 'title'>>;
}

/**
 * A pure component, an accordion panel which can display information about replacements for a given EPR module.
 */
export const ReplacementCard = ({ replacements }: Props) => {
  if (replacements.length === 0) {
    return null;
  }

  const buttons = replacements.map((replacement) => (
    <EuiFlexItem grow={false}>
      <span>
        <EuiButton
          key={replacement.id}
          href={replacement.uiInternalPath}
          fullWidth={false}
          size="s"
        >
          {replacement.title}
        </EuiButton>
      </span>
    </EuiFlexItem>
  ));

  return (
    <div>
      <EuiAccordion id="accordion1" buttonContent="Also available in Beats" paddingSize="none">
        <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText size="s">
                Elastic Agent Integrations are recommended, but you can also use Beats. For more
                details, check out our comparison page.
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup direction="column" gutterSize="m">
                {buttons}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiAccordion>
    </div>
  );
};
