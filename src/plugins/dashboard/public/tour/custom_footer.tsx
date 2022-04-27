/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

export const CustomFooter = ({ onSkip, onNext }: { onSkip: () => void; onNext: () => void }) => {
  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty color="text" size="xs" onClick={onSkip}>
          Skip tour
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" color="success" onClick={onNext}>
          Next
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
