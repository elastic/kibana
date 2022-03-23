/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  KibanaPageTemplateSolutionNavAvatar,
  KibanaPageTemplateSolutionNavAvatarProps,
} from './solution_nav_avatar';

export default {
  title: 'Page Template/Solution Nav/Solution Nav Avatar',
  description: 'A wrapper around EuiAvatar, with some extra styling',
};

type Params = Pick<KibanaPageTemplateSolutionNavAvatarProps, 'size' | 'name'>;

export const PureComponent = (params: Params) => {
  return <KibanaPageTemplateSolutionNavAvatar {...params} />;
};

PureComponent.argTypes = {
  name: {
    control: 'text',
    defaultValue: 'Solution Name',
  },
  size: {
    control: 'radio',
    options: ['s', 'm', 'l', 'xl', 'xxl'],
  },
};
