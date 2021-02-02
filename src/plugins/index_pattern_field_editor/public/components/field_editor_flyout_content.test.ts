/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { registerTestBed, TestBed, noop, docLinks } from '../test_utils';
import { Field } from '../types';
import { FieldEditorFlyoutContent, Props } from './field_editor_flyout_content';

const setup = (props?: Props) =>
  registerTestBed(FieldEditorFlyoutContent, {
    memoryRouter: { wrapComponent: false },
  })(props) as TestBed;

const defaultProps: Props = {
  onSave: noop,
  onCancel: noop,
  docLinks,
  FieldEditor: null,
  fieldTypeToProcess: 'runtime',
};

describe('<FieldEditorFlyoutContent />', () => {
  test('should have the correct title', () => {
    const { exists, find } = setup();
    expect(exists('flyoutTitle')).toBe(true);
    expect(find('flyoutTitle').text()).toBe('Create new field');
  });

  test('should allow a runtime field to be provided', () => {
    const field: Field = {
      name: 'foo',
    } as any;

    const { find } = setup({ ...defaultProps, field });

    expect(find('flyoutTitle').text()).toBe(`Edit ${field.name} field`);

    // TODO uncomment following test when the editor is integrated
    // expect(find('nameField.input').props().value).toBe(field.name);
    // expect(find('typeField').props().value).toBe(field.type);
    // expect(find('scriptField').props().value).toBe(field.script.source);
  });
});
