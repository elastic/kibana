/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mount } from 'enzyme';
import { CategoricalColorMapping, ColorMappingInputData } from './categorical_color_mapping';
import { AVAILABLE_PALETTES } from './palettes';
import { DEFAULT_COLOR_MAPPING_CONFIG } from './config/default_color_mapping';
import { MULTI_FIELD_KEY_SEPARATOR } from '@kbn/data-plugin/common';

const ASSIGNMENTS_LIST = '[data-test-subj="lns-colorMapping-assignmentsList"]';
const ASSIGNMENTS_PROMPT = '[data-test-subj="lns-colorMapping-assignmentsPrompt"]';
const ASSIGNMENTS_PROMPT_ADD_ALL = '[data-test-subj="lns-colorMapping-assignmentsPromptAddAll"]';
const ASSIGNMENT_ITEM = (i: number) => `[data-test-subj="lns-colorMapping-assignmentsItem${i}"]`;

describe('color mapping', () => {
  it('load a default color mapping', () => {
    const dataInput: ColorMappingInputData = {
      type: 'categories',
      categories: ['categoryA', 'categoryB'],
    };
    const onModelUpdateFn = jest.fn();
    const component = mount(
      <CategoricalColorMapping
        data={dataInput}
        isDarkMode={false}
        model={{ ...DEFAULT_COLOR_MAPPING_CONFIG }}
        palettes={AVAILABLE_PALETTES}
        onModelUpdate={onModelUpdateFn}
        specialTokens={new Map()}
      />
    );

    // empty list prompt visible
    expect(component.find(ASSIGNMENTS_PROMPT)).toBeTruthy();
    expect(onModelUpdateFn).not.toBeCalled();
  });

  it('Add all terms to assignments', () => {
    const dataInput: ColorMappingInputData = {
      type: 'categories',
      categories: ['categoryA', 'categoryB'],
    };
    const onModelUpdateFn = jest.fn();
    const component = mount(
      <CategoricalColorMapping
        data={dataInput}
        isDarkMode={false}
        model={{ ...DEFAULT_COLOR_MAPPING_CONFIG }}
        palettes={AVAILABLE_PALETTES}
        onModelUpdate={onModelUpdateFn}
        specialTokens={new Map()}
      />
    );
    component.find(ASSIGNMENTS_PROMPT_ADD_ALL).hostNodes().simulate('click');
    expect(onModelUpdateFn).toBeCalledTimes(1);
    expect(component.find(ASSIGNMENTS_LIST).hostNodes().children().length).toEqual(
      dataInput.categories.length
    );
    dataInput.categories.forEach((category, index) => {
      const assignment = component.find(ASSIGNMENT_ITEM(index)).hostNodes();
      expect(assignment.text()).toEqual(category);
      expect(assignment.hasClass('euiComboBox-isDisabled')).toEqual(false);
    });
  });

  it('handle special tokens, multi-fields keys and non-trimmed whitespaces', () => {
    const dataInput: ColorMappingInputData = {
      type: 'categories',
      categories: ['__other__', ['fieldA', 'fieldB'], '__empty__', '   with-whitespaces   '],
    };
    const onModelUpdateFn = jest.fn();
    const component = mount(
      <CategoricalColorMapping
        data={dataInput}
        isDarkMode={false}
        model={{ ...DEFAULT_COLOR_MAPPING_CONFIG }}
        palettes={AVAILABLE_PALETTES}
        onModelUpdate={onModelUpdateFn}
        specialTokens={
          new Map([
            ['__other__', 'Other'],
            ['__empty__', '(Empty)'],
          ])
        }
      />
    );
    component.find(ASSIGNMENTS_PROMPT_ADD_ALL).hostNodes().simulate('click');
    expect(component.find(ASSIGNMENTS_LIST).hostNodes().children().length).toEqual(
      dataInput.categories.length
    );
    const assignment1 = component.find(ASSIGNMENT_ITEM(0)).hostNodes();
    expect(assignment1.text()).toEqual('Other');

    const assignment2 = component.find(ASSIGNMENT_ITEM(1)).hostNodes();
    expect(assignment2.text()).toEqual(`fieldA${MULTI_FIELD_KEY_SEPARATOR}fieldB`);

    const assignment3 = component.find(ASSIGNMENT_ITEM(2)).hostNodes();
    expect(assignment3.text()).toEqual('(Empty)');

    const assignment4 = component.find(ASSIGNMENT_ITEM(3)).hostNodes();
    expect(assignment4.text()).toEqual('   with-whitespaces   ');
  });
});
