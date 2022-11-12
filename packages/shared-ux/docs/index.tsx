/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getMetaElementParameters } from '@kbn/shared-ux-storybook-docs';
import { getStorybookDescriptorIndex, isElasticMetadata } from './articles';
import type { ArticleIndex } from './articles';

const articleIndex: ArticleIndex = {
  Documentation: {
    Outline: './mdx/outline.mdx',
    Overview: {
      'Core Tenets': './mdx/core_tenets.mdx',
    },
  },
};

const descriptorIndex = getStorybookDescriptorIndex(articleIndex);

export const getTitle = (path: string) => {
  const key = path ? path.split('/').pop() : null;
  return key ? descriptorIndex[key] : null;
};

export const getParameters = (meta: any) => {
  if (!isElasticMetadata(meta)) {
    return null;
  }

  return getMetaElementParameters(meta);
};

import thing from './mdx/test.mdx';
console.log(thing);
