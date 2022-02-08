/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { Markdown as MarkdownComponent } from './markdown.component';
import { Markdown } from './markdown';
import mdx from './markdown.mdx';

export default {
  title: 'Markdown Component',
  description: 'A markdown component that is simple or more complex.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const ConnectedComponent = () => {
  return <Markdown />;
};

ConnectedComponent.argTypes = {
  children: {
    control: 'text',
    defaultValue: true,
  },
};

export const PureComponent = () => {
  return <MarkdownComponent />;
};
