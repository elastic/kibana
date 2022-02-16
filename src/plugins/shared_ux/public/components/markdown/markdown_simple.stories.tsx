/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { MarkdownSimple as MarkdownSimpleComponent } from './markdown_simple.component';
import mdx from './markdown.mdx';

export default {
  title: 'Simple Markdown Component',
  description: 'A markdown component that is simple.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const ConnectedComponent = () => {
  return <MarkdownSimpleComponent children={'testfordays'} />;
};

ConnectedComponent.argTypes = {
  children: {
    name: 'children',
    label: 'children',
    type: { name: 'string', required: true },
    defaultValue: 'text for markdown component',
    table: {
      type: { summary: 'string' },
    },
    control: {
      type: 'text',
    },
  },
};
