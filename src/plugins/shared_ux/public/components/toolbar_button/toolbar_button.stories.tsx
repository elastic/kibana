/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { ToolbarButton as ToolbarButtonComponent } from './toolbar_button.component';
import mdx from './toolbar_button.mdx';

export default {
  title: 'Toolbar Button',
  description: 'A button in the toolbar',
  parameters: {
    docs: { page: mdx },
  },
};

const title = 'test';

export const PureComponent = () => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiPopover
        ownFocus
        button={
          <ToolbarButtonComponent iconType="managementApp" iconSide="left">
            <EuiText size="m">Sample Text</EuiText>
          </ToolbarButtonComponent>
        }
        anchorPosition="downRight"
      >
        <EuiPopoverTitle>{title}</EuiPopoverTitle>
        Test
      </EuiPopover>
    </EuiFlexGroup>
  );
};
