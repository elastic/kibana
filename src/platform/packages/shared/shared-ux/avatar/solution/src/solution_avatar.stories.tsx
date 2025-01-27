/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { KibanaSolutionAvatar, IconTypeProps, KnownSolutionProps } from './solution_avatar';

export default {
  title: 'Avatar/Solution',
  description: 'A wrapper around EuiAvatar, specifically to stylize Elastic Solutions',
};

const argTypes = {
  size: {
    control: 'select',
    options: ['s', 'm', 'l', 'xl', 'xxl'],
    defaultValue: 'xxl',
  },
};

type KnownSolutionParams = Pick<KnownSolutionProps, 'size' | 'name'>;

export const SolutionType = (params: KnownSolutionParams) => {
  return <KibanaSolutionAvatar {...params} />;
};

SolutionType.argTypes = {
  name: {
    control: 'select',
    options: ['Cloud', 'Elastic', 'Kibana', 'Observability', 'Security', 'Enterprise Search'],
    defaultValue: 'Elastic',
  },
  ...argTypes,
};

type IconTypeParams = Pick<IconTypeProps, 'size' | 'name' | 'iconType'>;

export const IconType = (params: IconTypeParams) => {
  return <KibanaSolutionAvatar {...params} />;
};

IconType.argTypes = {
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
    defaultValue: 'logoElastic',
  },
  name: {
    control: 'text',
    defaultValue: 'Solution Name',
  },
  ...argTypes,
};
