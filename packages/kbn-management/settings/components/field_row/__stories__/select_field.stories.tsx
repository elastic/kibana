/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFieldRowStory, getStory } from './common';

const argTypes = {
  userValue: {
    name: 'Current saved value',
    control: {
      type: 'select',
      options: ['option1', 'option2', 'option3'],
    },
  },
};

const settingFields = {
  optionLabels: { option1: 'Option 1', option2: 'Option 2', option3: 'Option 3' },
  options: ['option1', 'option2', 'option3'],
};

export default getStory('Select Row', 'A setting with a boolean value.', argTypes);
export const SelectRow = getFieldRowStory('select' as const, settingFields);
