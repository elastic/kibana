/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { StoryObj, ArgTypes } from '@storybook/react';
import { type EuiAvatarProps } from '@elastic/eui';
import type { IconTypeProps, KnownSolutionProps } from './solution_avatar';
import { KibanaSolutionAvatar } from './solution_avatar';

export default {
  title: 'Avatar/Solution',
  description: 'A wrapper around EuiAvatar, specifically to stylize Elastic Solutions',
};

const argTypes: ArgTypes<Pick<EuiAvatarProps, 'size'>> = {
  size: {
    control: 'select',
    options: ['s', 'm', 'l', 'xl', 'xxl'],
  },
};

type KnownSolutionParams = Pick<KnownSolutionProps, 'size' | 'name'>;

export const SolutionType: StoryObj<KnownSolutionParams> = {
  render: (params: KnownSolutionParams) => {
    return <KibanaSolutionAvatar {...params} />;
  },

  argTypes: {
    name: {
      control: 'select',
      options: ['Cloud', 'Elastic', 'Kibana', 'Observability', 'Security', 'Enterprise Search'],
    },
    ...argTypes,
  },

  args: {
    size: 'xxl',
    name: 'Elastic',
  },
};

type IconTypeParams = Pick<IconTypeProps, 'size' | 'name' | 'iconType'>;

export const IconType: StoryObj<IconTypeParams> = {
  render: (params: IconTypeParams) => {
    return <KibanaSolutionAvatar {...params} />;
  },

  argTypes: {
    iconType: {
      control: 'select',
      options: [
        'logoCloud',
        'logoElastic',
        'logoElasticsearch',
        'logoElasticStack',
        'logoKibana',
        'logoObservability',
        'logoSecurity',
        'logoSiteSearch',
        'logoWorkplaceSearch',
        'machineLearningApp',
        'managementApp',
      ],
    },
    name: {
      control: 'text',
    },
    ...argTypes,
  },

  args: {
    size: 'xxl',
    iconType: 'logoElastic',
    name: 'Solution Name',
  },
};
