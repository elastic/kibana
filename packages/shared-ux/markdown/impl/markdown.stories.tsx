/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { MarkdownStorybookMock, MarkdownStorybookParams } from '@kbn/shared-ux-markdown-mocks';

import { EuiFlexItem } from '@elastic/eui';
import mdx from './README.mdx';
import { Markdown } from './markdown';

export default {
  title: 'Markdown/Markdown',
  description: 'A wrapper around `EuiMarkdownEditor`, to be used for markdown within Kibana',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new MarkdownStorybookMock();
const argTypes = mock.getArgumentTypes();

export const MarkdownStoryComponent = (params: MarkdownStorybookParams) => {
  return (
    <EuiFlexItem style={{ width: '50%' }}>
      <Markdown {...params} />
    </EuiFlexItem>
  );
};

MarkdownStoryComponent.argTypes = argTypes;
