/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { RIGHT_SECTION_TEST_ID } from './test_ids';

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
export const RightSection: React.FC<RightSectionProps> = memo(
  ({ component, width }: RightSectionProps) => {
    const style = useMemo<React.CSSProperties>(
      () => ({ height: '100%', width: `${width}px` }),
      [width]
    );

    return (
      <EuiFlexItem grow={false} style={style} data-test-subj={RIGHT_SECTION_TEST_ID}>
        {component}
      </EuiFlexItem>
    );
  }
);

RightSection.displayName = 'RightSection';
