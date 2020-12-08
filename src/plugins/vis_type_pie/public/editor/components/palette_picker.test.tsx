/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
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
