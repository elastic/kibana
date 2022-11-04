/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { NoDataCardStorybookMock } from '@kbn/shared-ux-card-no-data-mocks';
import type { NoDataCardStorybookParams } from '@kbn/shared-ux-card-no-data-mocks';

import mdx from './README.mdx';

export default {
  title: 'Code Editor',
  description: 'A cohesive code editor',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new NoDataCardStorybookMock();
const argTypes = mock.getArgumentTypes();

export const CodeEditor = (params: NoDataCardStorybookParams) => {
  return <></>;
};

CodeEditor.argTypes = argTypes;
