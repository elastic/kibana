/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';
import {
  KibanaPageTemplateSolutionNavCollapseButton,
  KibanaPageTemplateSolutionNavCollapseButtonProps,
} from './solution_nav_collapse_button';

export default {
  title: 'Solution Nav Collapse Button',
  description: 'A wrapper around EuiButtonIcon, styled to look like a show/hide button',
};

type Params = Pick<KibanaPageTemplateSolutionNavCollapseButtonProps, 'collapsed'>;

export const PureComponent = (params: Params) => {
  return <KibanaPageTemplateSolutionNavCollapseButton {...params} onClick={action('clicked')} />;
};

PureComponent.argTypes = {
  collapsed: {
    control: 'boolean',
    defaultValue: false,
  },
};
