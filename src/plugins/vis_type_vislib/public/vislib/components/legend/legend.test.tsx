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
import { mount, ReactWrapper } from 'enzyme';

import { I18nProvider } from '@kbn/i18n/react';
import { EuiButtonGroup } from '@elastic/eui';

import { VisLegend, VisLegendProps } from './legend';
import { legendColors } from './models';
import { act } from '@testing-library/react';

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    htmlIdGenerator: jest.fn().mockReturnValue(() => 'legendId'),
  };
});

jest.mock('../../../services', () => ({
  getDataActions: () => ({
    createFiltersFromValueClickAction: jest.fn().mockResolvedValue(['yes']),
  }),
}));

const fireEvent = jest.fn();

const vislibVis = {
  handler: {
    highlight: jest.fn(),
    unHighlight: jest.fn(),
  },
  getLegendLabels: jest.fn(),
  visConfigArgs: {
    type: 'area',
  },
  visConfig: {
    data: {
      getColorFunc: jest.fn().mockReturnValue(() => 'red'),
    },
  },
};

const visData = {
  series: [
    {
      label: 'A',
      values: [
        {
          seriesRaw: 'valuesA',
        },
      ],
    },
    {
      label: 'B',
      values: [
        {
          seriesRaw: 'valuesB',
        },
      ],
    },
  ],
};

const mockState = new Map();
const uiState = {
  get: jest
    .fn()
    .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
  set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
  emit: jest.fn(),
  setSilent: jest.fn(),
} as any;

const getWrapper = async (props?: Partial<VisLegendProps>) => {
  const wrapper = mount(
    <I18nProvider>
      <VisLegend
        addLegend
        position="top"
        fireEvent={fireEvent}
        vislibVis={vislibVis}
        visData={visData}
        uiState={uiState}
        {...props}
      />
    </I18nProvider>
  );

  await (wrapper.find(VisLegend).instance() as VisLegend).refresh();
  wrapper.update();
  return wrapper;
};

const getLegendItems = (wrapper: ReactWrapper) => wrapper.find('.visLegend__button');

describe('VisLegend Component', () => {
  let wrapper: ReactWrapper;

  afterEach(() => {
    mockState.clear();
    jest.clearAllMocks();
  });

  describe('Legend open', () => {
    beforeEach(async () => {
      mockState.set('vis.legendOpen', true);
      wrapper = await getWrapper();
    });

    it('should match the snapshot', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('Legend closed', () => {
    beforeEach(async () => {
      mockState.set('vis.legendOpen', false);
      wrapper = await getWrapper();
    });

    it('should match the snapshot', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('Highlighting', () => {
    beforeEach(async () => {
      wrapper = await getWrapper();
    });

    it('should call highlight handler when legend item is focused', async () => {
      const first = getLegendItems(wrapper).first();

      first.simulate('focus');

      expect(vislibVis.handler.highlight).toHaveBeenCalledTimes(1);
    });

    it('should call highlight handler when legend item is hovered', async () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('mouseEnter');

      expect(vislibVis.handler.highlight).toHaveBeenCalledTimes(1);
    });

    it('should call unHighlight handler when legend item is blurred', async () => {
      let first = getLegendItems(wrapper).first();
      first.simulate('focus');
      first = getLegendItems(wrapper).first();
      first.simulate('blur');

      expect(vislibVis.handler.unHighlight).toHaveBeenCalledTimes(1);
    });

    it('should call unHighlight handler when legend item is unhovered', async () => {
      const first = getLegendItems(wrapper).first();

      first.simulate('mouseEnter');
      first.simulate('mouseLeave');

      expect(vislibVis.handler.unHighlight).toHaveBeenCalledTimes(1);
    });

    it('should work with no handlers set', () => {
      const newProps = {
        vislibVis: {
          ...vislibVis,
          handler: null,
        },
      };

      expect(async () => {
        wrapper = await getWrapper(newProps);
        const first = getLegendItems(wrapper).first();
        first.simulate('focus');
        first.simulate('blur');
      }).not.toThrow();
    });
  });

  describe('Filtering', () => {
    beforeEach(async () => {
      wrapper = await getWrapper();
    });

    it('should filter out when clicked', () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('click');
      const filterGroup = wrapper.find(EuiButtonGroup).first();
      act(() => {
        filterGroup.getElement().props.onChange('filterIn');
      });

      expect(fireEvent).toHaveBeenCalledWith({
        name: 'filterBucket',
        data: { data: ['valuesA'], negate: false },
      });
      expect(fireEvent).toHaveBeenCalledTimes(1);
    });

    it('should filter in when clicked', () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('click');
      const filterGroup = wrapper.find(EuiButtonGroup).first();
      act(() => {
        filterGroup.getElement().props.onChange('filterOut');
      });

      expect(fireEvent).toHaveBeenCalledWith({
        name: 'filterBucket',
        data: { data: ['valuesA'], negate: true },
      });
      expect(fireEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggles details', () => {
    beforeEach(async () => {
      wrapper = await getWrapper();
    });

    it('should show details when clicked', () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('click');

      expect(wrapper.exists('.visColorPicker')).toBe(true);
    });
  });

  describe('setColor', () => {
    beforeEach(async () => {
      wrapper = await getWrapper();
    });

    it('sets the color in the UI state', () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('click');

      const popover = wrapper.find('.visColorPicker').first();
      const firstColor = popover.find('.visColorPicker__valueDot').first();
      firstColor.simulate('click');

      const colors = mockState.get('vis.colors');

      expect(colors.A).toBe(legendColors[0]);
    });
  });

  describe('toggleLegend function', () => {
    it('click should show legend once toggled from hidden', async () => {
      mockState.set('vis.legendOpen', false);
      wrapper = await getWrapper();
      const toggleButton = wrapper.find('.visLegend__toggle').first();
      toggleButton.simulate('click');

      expect(wrapper.exists('.visLegend__list')).toBe(true);
    });

    it('click should hide legend once toggled from shown', async () => {
      mockState.set('vis.legendOpen', true);
      wrapper = await getWrapper();
      const toggleButton = wrapper.find('.visLegend__toggle').first();
      toggleButton.simulate('click');

      expect(wrapper.exists('.visLegend__list')).toBe(false);
    });
  });
});
