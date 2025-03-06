/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { MarkdownStorybookMock, MarkdownStorybookParams } from '@kbn/shared-ux-markdown-mocks';

import { EuiFlexItem } from '@elastic/eui';
import mdx from './README.mdx';
import { Markdown } from './markdown';

export default {
  title: 'Markdown/Markdown Editor',
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
    // The markdown component is wrapped in the EuiFlexItem with width set to 50%
    // Height can be set for the markdown component
    <EuiFlexItem style={{ width: '400px' }}>
      {/* readOnly is set to false because the Markdown component editor will error if set to true without markdown content or children  */}
      <Markdown {...params} readOnly={false} />
    </EuiFlexItem>
  );
};

MarkdownStoryComponent.argTypes = argTypes;
