/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { LEFT_SECTION } from './test_ids';

interface LeftSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
  /**
   * Width used when rendering the panel
   */
  width: number;
}

/**
 * Left section of the expanded flyout rendering a panel
 */
export const LeftSection: React.FC<LeftSectionProps> = ({ component, width }: LeftSectionProps) => {
  return (
    <EuiFlexItem grow data-test-subj={LEFT_SECTION}>
      <EuiFlexGroup direction="column" style={{ maxWidth: width, width: 'auto' }}>
        {component}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

LeftSection.displayName = 'LeftSection';
