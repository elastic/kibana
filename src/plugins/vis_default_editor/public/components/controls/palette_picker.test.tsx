/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { PalettePicker, PalettePickerProps } from './palette_picker';
import { chartPluginMock } from '../../../../charts/public/mocks';
import { EuiColorPalettePicker } from '@elastic/eui';

describe('PalettePicker', function () {
  let props: PalettePickerProps<'palette'>;
  let component: ReactWrapper<PalettePickerProps<'palette'>>;

  beforeAll(() => {
    props = {
      palettes: chartPluginMock.createPaletteRegistry(),
      paramName: 'palette',
      activePalette: {
        type: 'palette',
        name: 'kibana_palette',
      },
      setPalette: jest.fn(),
    };
  });

  it('renders the EuiPalettePicker', () => {
    component = mountWithIntl(<PalettePicker {...props} />);
    expect(component.find(EuiColorPalettePicker).length).toBe(1);
  });

  it('renders the default palette if not activePalette is given', function () {
    const { activePalette, ...newProps } = props;
    component = mountWithIntl(<PalettePicker {...newProps} />);
    const palettePicker = component.find(EuiColorPalettePicker);
    expect(palettePicker.props().valueOfSelected).toBe('default');
  });

  it('renders the activePalette palette if given', function () {
    component = mountWithIntl(<PalettePicker {...props} />);
    const palettePicker = component.find(EuiColorPalettePicker);
    expect(palettePicker.props().valueOfSelected).toBe('kibana_palette');
  });
});
