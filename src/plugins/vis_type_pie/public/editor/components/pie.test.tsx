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
import PieOptions, { PieOptionsProps } from './pie';
import { chartPluginMock } from '../../../../charts/public/mocks';
import { findTestSubject } from '@elastic/eui/lib/test';

jest.mock('../collections', () => ({
  getLabelPositions: jest.fn(() => []),
  getValuesFormats: jest.fn(() => []),
}));

describe('PalettePicker', function () {
  let props: PieOptionsProps;
  let component: ReactWrapper<PieOptionsProps>;

  beforeAll(() => {
    props = ({
      palettes: chartPluginMock.createPaletteRegistry(),
      showElasticChartsOptions: true,
      vis: {
        type: {
          editorConfig: {
            collections: {
              legendPositions: [
                {
                  text: 'Top',
                  value: 'top',
                },
                {
                  text: 'Left',
                  value: 'left',
                },
                {
                  text: 'Right',
                  value: 'right',
                },
                {
                  text: 'Bottom',
                  value: 'bottom',
                },
              ],
            },
          },
        },
      },
      stateParams: {
        isDonut: true,
        legendPosition: 'left',
        labels: {
          show: true,
        },
      },
    } as unknown) as PieOptionsProps;
  });

  it('renders the nested legend switch for the elastic charts implementation', () => {
    component = mountWithIntl(<PieOptions {...props} />);
    expect(findTestSubject(component, 'visTypePieNestedLegendSwitch').length).toBe(1);
  });

  it('not renders the nested legend switch for the vislib implementation', () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    expect(findTestSubject(component, 'visTypePieNestedLegendSwitch').length).toBe(0);
  });

  it('renders the palettes picker for the elastic charts implementation', () => {
    component = mountWithIntl(<PieOptions {...props} />);
    expect(findTestSubject(component, 'piePalettePicker').length).toBe(1);
  });

  it('not renders the palettes picker for the vislib implementation', () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    expect(findTestSubject(component, 'piePalettePicker').length).toBe(0);
  });

  it('renders the label position dropdown for the elastic charts implementation', () => {
    component = mountWithIntl(<PieOptions {...props} />);
    expect(findTestSubject(component, 'visTypePieLabelPositionSelect').length).toBe(1);
  });

  it('not renders the label position dropdown for the vislib implementation', () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    expect(findTestSubject(component, 'visTypePieLabelPositionSelect').length).toBe(0);
  });

  it('not renders the top level switch for the elastic charts implementation', () => {
    component = mountWithIntl(<PieOptions {...props} />);
    expect(findTestSubject(component, 'visTypePieTopLevelSwitch').length).toBe(0);
  });

  it('renders the top level switch for the vislib implementation', () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    expect(findTestSubject(component, 'visTypePieTopLevelSwitch').length).toBe(1);
  });

  it('renders the value format dropdown for the elastic charts implementation', () => {
    component = mountWithIntl(<PieOptions {...props} />);
    expect(findTestSubject(component, 'visTypePieValueFormatsSelect').length).toBe(1);
  });

  it('not renders the value format dropdown for the vislib implementation', () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    expect(findTestSubject(component, 'visTypePieValueFormatsSelect').length).toBe(0);
  });
});
