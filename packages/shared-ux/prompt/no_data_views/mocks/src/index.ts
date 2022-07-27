/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getNoDataViewsPromptServicesMock } from './jest';

export type { Params as NoDataViewsPromptStorybookParams } from './storybook';
export type { Params as NoDataViewsPromptComponentStorybookParams } from './storybook_component';

import { StorybookMock } from './storybook';
import { StorybookComponentMocks } from './storybook_component';

/**
 * Storybook mocks for the `NoDataViewsPrompt` component.
 */
export const NoDataViewsPromptStorybookMock = new StorybookMock();

/**
 * Storybook mocks for the `NoDataViewsPromptComponent` component.
 */
export const NoDataViewsPromptComponentStorybookMock = new StorybookComponentMocks();
