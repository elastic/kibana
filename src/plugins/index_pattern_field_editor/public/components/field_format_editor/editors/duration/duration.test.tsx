/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { DurationFormatEditor } from './duration';
import { FieldFormat } from 'src/plugins/field_formats/common';
import { EuiSwitch } from '@elastic/eui';

const fieldType = 'number';
const format = {
  getConverterFor: jest
    .fn()
    .mockImplementation(() => (input: string) => `converted duration for ${input}`),
  getParamDefaults: jest.fn().mockImplementation(() => {
    return {
      inputFormat: 'seconds',
      outputFormat: 'humanize',
      outputPrecision: 10,
      includeSpaceWithSuffix: true,
    };
  }),
  isHuman: () => true,
  isHumanPrecise: () => false,
  type: {
    inputFormats: [
      {
        text: 'Seconds',
        kind: 'seconds',
      },
    ],
    outputFormats: [
      {
        text: 'Human Readable',
        method: 'humanize',
      },
      {
        text: 'Minutes',
        method: 'asMinutes',
      },
    ],
  },
};
const formatParams = {
  outputPrecision: 2,
  inputFormat: '',
  outputFormat: '',
};
const onChange = jest.fn();
const onError = jest.fn();

describe('DurationFormatEditor', () => {
  it('should have a formatId', () => {
    expect(DurationFormatEditor.formatId).toEqual('duration');
  });

  it('should render human readable output normally', async () => {
    const component = shallow(
      <DurationFormatEditor
        fieldType={fieldType}
        format={format as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('should render non-human readable output normally', async () => {
    const newFormat = {
      ...format,
      getParamDefaults: jest.fn().mockImplementation(() => {
        return {
          inputFormat: 'seconds',
          outputFormat: 'asMinutes',
          outputPrecision: 10,
          includeSpaceWithSuffix: true,
        };
      }),
      isHuman: () => false,
    };
    const component = shallow(
      <DurationFormatEditor
        fieldType={fieldType}
        format={newFormat as unknown as FieldFormat}
        formatParams={formatParams}
        onChange={onChange}
        onError={onError}
      />
    );
    const labels = component.find(EuiSwitch);
    expect(labels.length).toEqual(3);
    expect(labels.get(0).props.label.props.defaultMessage).toEqual('Show suffix');
    expect(labels.get(1).props.label.props.defaultMessage).toEqual('Use short suffix');
    expect(labels.get(2).props.label.props.defaultMessage).toEqual(
      'Include space between suffix and value'
    );

    expect(component).toMatchSnapshot();
  });

  it('should not render show suffix on dynamic output', async () => {
    const newFormat = {
      ...format,
      getParamDefaults: jest.fn().mockImplementation(() => {
        return {
          inputFormat: 'seconds',
          outputFormat: 'dynamic',
          outputPrecision: 2,
          includeSpaceWithSuffix: true,
        };
      }),
      isHuman: () => false,
      isHumanPrecise: () => true,
    };
    const component = shallow(
      <DurationFormatEditor
        fieldType={fieldType}
        format={newFormat as unknown as FieldFormat}
        formatParams={{ ...formatParams, outputFormat: 'dynamic' }}
        onChange={onChange}
        onError={onError}
      />
    );

    const labels = component.find(EuiSwitch);
    expect(labels.length).toEqual(2);
    const useShortSuffixSwitch = labels.get(0);

    expect(useShortSuffixSwitch.props.label.props.defaultMessage).toEqual('Use short suffix');
    expect(useShortSuffixSwitch.props.disabled).toEqual(false);

    const includeSpaceSwitch = labels.get(1);

    expect(includeSpaceSwitch.props.disabled).toEqual(false);
    expect(includeSpaceSwitch.props.label.props.defaultMessage).toEqual(
      'Include space between suffix and value'
    );

    expect(component).toMatchSnapshot();
  });
});
