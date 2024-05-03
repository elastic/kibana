/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import { LEFT_SECTION_TEST_ID } from './test_ids';

interface LeftSectionProps {
  /**
   * Component to be rendered
   */
  component: React.ReactElement;
}

/**
 * Left section of the expanded flyout rendering a panel
 */
export const LeftSection: React.FC<LeftSectionProps> = memo(({ component }: LeftSectionProps) => {
  console.log('render - LeftSection');
  return (
    <EuiFlexItem grow data-test-subj={LEFT_SECTION_TEST_ID} style={{ height: '100%' }}>
      {component}
    </EuiFlexItem>
  );
});

LeftSection.displayName = 'LeftSection';
