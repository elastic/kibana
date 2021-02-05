/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { IndexPatternCreationConfig } from '../../../../../../../plugins/index_pattern_management/public';
import { IFieldType } from '../../../../../../../plugins/data/public';
import { mockManagementPlugin } from '../../../../mocks';
import { createComponentWithContext } from '../../../test_utils';

import { StepTimeField } from '../step_time_field';

jest.mock('./components/header', () => ({ Header: 'Header' }));
jest.mock('./components/time_field', () => ({ TimeField: 'TimeField' }));
jest.mock('./components/advanced_options', () => ({ AdvancedOptions: 'AdvancedOptions' }));
jest.mock('./components/action_buttons', () => ({ ActionButtons: 'ActionButtons' }));
jest.mock('./../../lib', () => ({
  extractTimeFields: jest.requireActual('./../../lib').extractTimeFields,
  ensureMinimumTime: async (fields: IFieldType) => Promise.resolve(fields),
}));

const mockIndexPatternCreationType = new IndexPatternCreationConfig({
  type: 'default',
  name: 'name',
});

const noop = () => {};
const mockContext = mockManagementPlugin.createIndexPatternManagmentContext();
const fields = [
  {
    name: '@timestamp',
    type: 'date',
  },
];
mockContext.data.indexPatterns = {
  create: () => ({}),
  getFieldsForWildcard: jest.fn().mockReturnValue(Promise.resolve(fields)),
} as any;

describe('StepTimeField', () => {
  it('should render normally', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    expect(component).toMatchSnapshot();
  });

  it('should render timeFields', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({
      timeFields: [
        { display: '@timestamp', fieldName: '@timestamp' },
        { display: 'name', fieldName: 'name' },
      ],
    });

    expect(component).toMatchSnapshot();
  });

  it('should render a selected timeField', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({
      timeFields: [
        { display: '@timestamp', fieldName: '@timestamp' },
        { display: 'name', fieldName: 'name' },
      ],
      selectedTimeField: '@timestamp',
      timeFieldSet: true,
    });

    expect(component).toMatchSnapshot();
  });

  it('should ensure disabled time field options work properly', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({
      timeFields: [
        { display: '@timestamp', fieldName: '@timestamp' },
        { display: 'name', fieldName: 'name' },
      ],
    });

    // If the value is undefined, that means the user selected the
    // `I don't want to use a Time filter` option
    (component.instance() as StepTimeField).onTimeFieldChanged(({
      target: { value: undefined },
    } as unknown) as React.ChangeEvent<HTMLSelectElement>);
    expect(component.state('timeFieldSet')).toBe(true);

    // If the value is an empty string, that means the user selected
    // an invalid selection (like the empty selection or the `-----`)
    (component.instance() as StepTimeField).onTimeFieldChanged(({
      target: { value: '' },
    } as unknown) as React.ChangeEvent<HTMLSelectElement>);
    expect(component.state('timeFieldSet')).toBe(false);
  });

  it('should disable the action button if an invalid time field is selected', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({
      timeFields: [
        { display: '@timestamp', fieldName: '@timestamp' },
        { display: 'name', fieldName: 'name' },
      ],
    });

    (component.instance() as StepTimeField).onTimeFieldChanged(({
      target: { value: '' },
    } as unknown) as React.ChangeEvent<HTMLSelectElement>);
    component.update();

    expect(component.find('ActionButtons')).toMatchSnapshot();
  });

  it('should enable the action button if the user decides to not select a time field', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({
      timeFields: [
        { display: '@timestamp', fieldName: '@timestamp' },
        { display: 'name', fieldName: 'name' },
      ],
    });

    (component.instance() as StepTimeField).onTimeFieldChanged(({
      target: { value: undefined },
    } as unknown) as React.ChangeEvent<HTMLSelectElement>);
    component.update();

    expect(component.find('ActionButtons')).toMatchSnapshot();
  });

  it('should render advanced options', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({ showingAdvancedOptions: true });

    expect(component).toMatchSnapshot();
  });

  it('should render advanced options with an index pattern id', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({
      showingAdvancedOptions: true,
      indexPatternId: 'foobar',
    });

    expect(component).toMatchSnapshot();
  });

  it('should render a loading state when creating the index pattern', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({ isCreating: true });

    expect(component).toMatchSnapshot();
  });

  it('should render any error message', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({ error: 'foobar' });

    expect(component).toMatchSnapshot();
  });

  it('should render "Custom index pattern ID already exists" when error is "Conflict"', () => {
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern: noop,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    component.setState({ error: 'Conflict' });

    expect(component).toMatchSnapshot();
  });

  it('should remember error thrown by createIndexPatter() prop', async () => {
    const createIndexPattern = async () => {
      throw new Error('foobar');
    };
    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    await (component.instance() as StepTimeField).createIndexPattern();
    component.update();

    expect(component.instance().state).toMatchObject({
      error: 'foobar',
    });
  });

  it('should call createIndexPattern with undefined time field when no time filter chosen', async () => {
    const createIndexPattern = jest.fn();

    const component = createComponentWithContext(
      StepTimeField,
      {
        indexPattern: 'ki*',
        goToPreviousStep: noop,
        createIndexPattern,
        indexPatternCreationType: mockIndexPatternCreationType,
      },
      mockContext
    );

    await (component.instance() as StepTimeField).fetchTimeFields();

    expect((component.state() as any).timeFields).toHaveLength(3);

    (component.instance() as StepTimeField).onTimeFieldChanged(({
      target: { value: undefined },
    } as unknown) as React.ChangeEvent<HTMLSelectElement>);

    await (component.instance() as StepTimeField).createIndexPattern();

    expect(createIndexPattern).toHaveBeenCalledWith(undefined, '');
  });
});
