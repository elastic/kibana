/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { MarkdownStorybookMock } from '@kbn/shared-ux-markdown-mocks';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import mdx from './README.mdx';
import { MarkdownSimple } from './markdown_simple';

export default {
  title: 'Markdown/Markdown Simple',
  description: 'A simple way to render markdown content within Kibana',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new MarkdownStorybookMock();
const argTypes = mock.getArgumentTypes();

export const MarkdownStoryComponent = () => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <MarkdownSimple src='My content in **markdown** format set as the *markdownContent prop*' />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

MarkdownStoryComponent.argTypes = argTypes;
