/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ToolbarButton as ToolbarButtonComponent } from './toolbar_button.component';
import { ToolbarButton } from './toolbar_button';
import mdx from './toolbar_button.mdx';

export default {
  title: 'Toolbar Button',
  description: 'A button in the toolbar',
  parameters: {
    docs: { page: mdx },
  },
};

export const ConnectedComponent = () => {
  return <ToolbarButton />;
};

export const PureComponent = () => {
  return <ToolbarButtonComponent />;
};
