/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { SolutionToolbarButton } from '../primary/primary';
import mdx from './add_from_library.mdx';

export default {
  title: 'Toolbar/Buttons/Add From Library Button',
  description: 'An implementation of the solution toolbar primary button',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const Component = () => {
  return <SolutionToolbarButton label="Add from library" iconType="folderOpen" />;
};
