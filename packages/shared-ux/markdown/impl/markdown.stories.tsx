/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import mdx from './README.mdx';

export default {
  title: 'Markdown/Markdown',
  description: 'A wrapper around `EuiMarkdown`, to be used for markdown within Kibana',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const Markdown = () => {
  return <Markdown />;
};

// Card.argTypes = argTypes;
