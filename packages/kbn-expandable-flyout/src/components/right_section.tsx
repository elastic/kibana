/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { RIGHT_SECTION } from './test_ids';

interface RightSectionProps {
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
 * Right section of the expanded flyout rendering a panel
 */
export const RightSection: React.FC<RightSectionProps> = ({
  component,
  width,
}: RightSectionProps) => {
  return (
    <EuiFlexItem grow={false} style={{ height: '100%' }} data-test-subj={RIGHT_SECTION}>
      <EuiFlexGroup direction="column" style={{ width }}>
        {component}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

RightSection.displayName = 'RightSection';
