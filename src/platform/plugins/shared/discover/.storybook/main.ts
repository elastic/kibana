/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { defaultConfig } from '@kbn/storybook';
import { configure } from '@storybook/test';
import path from 'path';

configure({ testIdAttribute: 'data-testsubj' });

type PreviewHeadFn = (head: string) => string | Promise<string | undefined> | undefined;
type WebpackFinalFn = Exclude<typeof defaultConfig.webpackFinal, undefined>;

const defaultPreviewHead = defaultConfig.previewHead as PreviewHeadFn | undefined;
const defaultWebpackFinal = defaultConfig.webpackFinal as WebpackFinalFn | undefined;

const sourceFieldTypeFilterPath = path.resolve(
  __dirname,
  '../../../packages/shared/kbn-unified-field-list/src/components/field_list_filters/field_type_filter.tsx'
);

const storybookFieldTypeFilterMockPath = path.resolve(
  __dirname,
  '../../../packages/shared/kbn-unified-field-list/src/components/field_list_filters/__storybook_mocks__/field_type_filter.tsx'
);

module.exports = {
  ...defaultConfig,
  addons: [...(defaultConfig.addons || []), '@storybook/addon-interactions'],
  webpackFinal: async (...args: Parameters<WebpackFinalFn>) => {
    const [config, options] = args;
    const storybookConfig =
      typeof defaultWebpackFinal === 'function'
        ? await defaultWebpackFinal(config, options)
        : config;

    const resolvedConfig = storybookConfig as {
      resolve?: {
        alias?: Record<string, string>;
      };
    };

    resolvedConfig.resolve = resolvedConfig.resolve ?? {};
    resolvedConfig.resolve.alias = {
      ...(resolvedConfig.resolve.alias ?? {}),
      [sourceFieldTypeFilterPath]: storybookFieldTypeFilterMockPath,
    };

    return resolvedConfig;
  },
  previewHead: async (head: string) => {
    const previewHead =
      typeof defaultPreviewHead === 'function' ? await defaultPreviewHead(head) : head;

    return (previewHead ?? '').replace(
      "window.top.location.pathname.replace(/index.html$/, '')",
      "window.top.location.pathname.replace(/(?:index|iframe)\\.html$/, '')"
    );
  },
};
