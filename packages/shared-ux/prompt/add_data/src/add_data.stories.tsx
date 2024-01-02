/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { StorybookMock as AddDataPromptStorybookMock, Params } from '../mocks/src/storybook';
import { AddDataPrompt as Component } from './add_data';

export default {
  title: 'No Data/Prompt',
  description: `Serious rock and roll for serious rock and roll listeners.`,
};

const mock = new AddDataPromptStorybookMock();

export const AddData = (params: Params) => {
  return <Component {...mock.getProps(params)} />;
};
