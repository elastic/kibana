/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { KibanaSolutionAvatar, KibanaSolutionAvatarProps } from './solution_avatar';

export default {
  title: 'Page Template/Solution Nav Avatar',
  description: 'A wrapper around EuiAvatar, with some extra styling',
};

type Params = Pick<KibanaSolutionAvatarProps, 'size' | 'name'>;

export const PureComponent = (params: Params) => {
  return <KibanaSolutionAvatar {...params} />;
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
