/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { SummaryDescription } from './summary_description';

export interface SummaryButtonProps {
  title: string;
  isSummaryOpen: boolean;
  date: string;
  time: string;
}

export const SummaryButton: React.FC<SummaryButtonProps> = ({
  title,
  isSummaryOpen,
  date,
  time,
}) => {
  return (
    <EuiFlexGroup wrap responsive={false} gutterSize="m" data-test-subj="caseSummaryButton">
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <AssistantIcon size="m" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiText css={{ marginTop: 2, marginBottom: 1 }}>
            <h5>{title}</h5>
          </EuiText>
        </EuiFlexGroup>
        {isSummaryOpen && <SummaryDescription date={date} time={time} />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SummaryButton.displayName = 'CaseSummaryButton';
