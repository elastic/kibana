/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { LegendColorPickerProps } from '@elastic/charts';
import { EuiPopover } from '@elastic/eui';
import { mount } from 'enzyme';
import { ComponentType, ReactWrapper } from 'enzyme';
import { useColorPicker } from './use_color_picker';
import type { PersistedState } from '../../../../../../../visualizations/public';
import { ColorPicker } from '../../../../components/color_picker';
import { PanelData } from '../../../../../../common/types';

const seriesWithTermsSplit = [
  {
    id: '61ca57f1-469d-11e7-af02-69e470af7417:0',
    label: '0',
    labelFormatted: 'false',
    data: [
      [1610532000000, 10],
      [1610542800000, 40],
    ],
  },
  {
    id: '61ca57f1-469d-11e7-af02-69e470af7417:1',
    label: '1',
    labelFormatted: 'true',
    data: [
      [1610532000000, 0],
      [1610542800000, 7],
    ],
  },
] as PanelData[];

jest.mock('@elastic/charts', () => {
  const original = jest.requireActual('@elastic/charts');

  return {
    ...original,
    getSpecId: jest.fn(() => {}),
  };
});

describe('useColorPicker', function () {
  let wrapperProps: LegendColorPickerProps;
  const mockState = new Map();
  const uiState = ({
    get: jest
      .fn()
      .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
    set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
    emit: jest.fn(),
    setSilent: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  } as unknown) as PersistedState;
  const Component: ComponentType<LegendColorPickerProps> = useColorPicker(
    'left',
    seriesWithTermsSplit,
    uiState
  );
  let wrapper: ReactWrapper<LegendColorPickerProps>;

  beforeAll(() => {
    wrapperProps = {
      color: 'rgb(109, 204, 177)',
      onClose: jest.fn(),
      onChange: jest.fn(),
      anchor: document.createElement('div'),
      seriesIdentifiers: [
        {
          key: 'key',
          specId: '61ca57f1-469d-11e7-af02-69e470af7417:0',
        },
      ],
    };
  });

  it('not renders the color picker if series id and specId not match', () => {
    const newProps = {
      ...wrapperProps,
      seriesIdentifiers: [{ key: 'key', specId: '61ca57f1-469d-11e7-af02-69e470af7417:test' }],
    };
    wrapper = mount(<Component {...newProps} />);
    expect(wrapper.find(ColorPicker).length).toBe(0);
  });

  it('renders the color picker if series id and specId match', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    expect(wrapper.find(ColorPicker).length).toBe(1);
  });

  it('renders the picker on the correct position', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    expect(wrapper.find(EuiPopover).prop('anchorPosition')).toEqual('rightCenter');
  });

  it('overwrites the color on the uiState', () => {
    wrapper = mount(<Component {...wrapperProps} />);
    wrapper.find('.euiColorPicker__swatchSelect').at(0).simulate('click');
    const colors = uiState.get('vis.colors', []);
    expect(colors).toStrictEqual([
      {
        id: '61ca57f1-469d-11e7-af02-69e470af7417:0',
        overwrite: {
          false: '#54B399',
        },
      },
    ]);
  });
});
