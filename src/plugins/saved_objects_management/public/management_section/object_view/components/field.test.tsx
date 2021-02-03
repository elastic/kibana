/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import { Field } from './field';
import { FieldState, FieldType } from '../../types';

describe('Field component', () => {
  const mountField = (props: {
    type: FieldType;
    name: string;
    value: any;
    disabled: boolean;
    state?: FieldState;
    onChange: (name: string, state: FieldState) => void;
  }) =>
    mount(
      <I18nProvider>
        <Field {...props} />
      </I18nProvider>
    ).find('Field');

  const defaultProps = {
    type: 'text' as FieldType,
    name: 'field',
    value: '',
    disabled: false,
    state: undefined,
    onChange: (name: string, state: FieldState) => undefined,
  };

  it('uses the field name as the label', () => {
    let mounted = mountField({ ...defaultProps, name: 'some.name' });
    expect(mounted.find('EuiFormLabel').text()).toMatchInlineSnapshot(`"some.name"`);

    mounted = mountField({ ...defaultProps, name: 'someother.name' });
    expect(mounted.find('EuiFormLabel').text()).toMatchInlineSnapshot(`"someother.name"`);
  });

  it('renders a EuiCodeEditor for json type', () => {
    const mounted = mountField({ ...defaultProps, type: 'json' });
    expect(mounted.exists('EuiCodeEditor')).toEqual(true);
  });

  it('renders a EuiCodeEditor for array type', () => {
    const mounted = mountField({ ...defaultProps, type: 'array' });
    expect(mounted.exists('EuiCodeEditor')).toEqual(true);
  });

  it('renders a EuiSwitch for boolean type', () => {
    const mounted = mountField({ ...defaultProps, type: 'boolean' });
    expect(mounted.exists('EuiSwitch')).toEqual(true);
  });

  it('display correct label for boolean type depending on value', () => {
    let mounted = mountField({ ...defaultProps, type: 'boolean', value: true });
    expect(mounted.find('EuiSwitch').text()).toMatchInlineSnapshot(`"On"`);

    mounted = mountField({ ...defaultProps, type: 'boolean', value: false });
    expect(mounted.find('EuiSwitch').text()).toMatchInlineSnapshot(`"Off"`);
  });

  it('renders a EuiFieldNumber for number type', () => {
    const mounted = mountField({ ...defaultProps, type: 'number' });
    expect(mounted.exists('EuiFieldNumber')).toEqual(true);
  });

  it('renders a EuiFieldText for text type', () => {
    const mounted = mountField({ ...defaultProps, type: 'text' });
    expect(mounted.exists('EuiFieldText')).toEqual(true);
  });

  it('renders a EuiFieldText as fallback', () => {
    const mounted = mountField({ ...defaultProps, type: 'unknown-type' as any });
    expect(mounted.exists('EuiFieldText')).toEqual(true);
  });
});
