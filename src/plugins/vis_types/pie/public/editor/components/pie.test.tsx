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
import PieOptions, { PieOptionsProps } from './pie';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { findTestSubject } from '@elastic/eui/lib/test';
import { act } from 'react-dom/test-utils';

describe('PalettePicker', function () {
  let props: PieOptionsProps;
  let component: ReactWrapper<PieOptionsProps>;

  beforeAll(() => {
    props = {
      palettes: chartPluginMock.createSetupContract().palettes,
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
      setValue: jest.fn(),
    } as unknown as PieOptionsProps;
  });

  it('renders the nested legend switch for the elastic charts implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieNestedLegendSwitch').length).toBe(1);
    });
  });

  it('not renders the nested legend switch for the vislib implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieNestedLegendSwitch').length).toBe(0);
    });
  });

  it('renders the long legend options for the elastic charts implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'pieLongLegendsOptions').length).toBe(1);
    });
  });

  it('not renders the long legend options for the vislib implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'pieLongLegendsOptions').length).toBe(0);
    });
  });

  it('renders the label position dropdown for the elastic charts implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieLabelPositionSelect').length).toBe(1);
    });
  });

  it('not renders the label position dropdown for the vislib implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieLabelPositionSelect').length).toBe(0);
    });
  });

  it('renders the top level switch for the elastic charts implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieTopLevelSwitch').length).toBe(1);
    });
  });

  it('renders the top level switch for the vislib implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieTopLevelSwitch').length).toBe(1);
    });
  });

  it('renders the value format dropdown for the elastic charts implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieValueFormatsSelect').length).toBe(1);
    });
  });

  it('not renders the value format dropdown for the vislib implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieValueFormatsSelect').length).toBe(0);
    });
  });

  it('renders the percent slider for the elastic charts implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieValueDecimals').length).toBe(1);
    });
  });

  it('renders the donut size button group for the elastic charts implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieEmptySizeRatioButtonGroup').length).toBe(1);
    });
  });

  it('not renders the donut size button group for the vislib implementation', async () => {
    component = mountWithIntl(<PieOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'visTypePieEmptySizeRatioButtonGroup').length).toBe(0);
    });
  });
});
