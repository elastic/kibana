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
import { act } from 'react-hooks-testing-library';
import { I18nProvider } from '@kbn/i18n/react';

import { VisLegend, VisLegendProps } from '../vislib_vis_legend/vislib_vis_legend';
import { legendColors } from './models';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  htmlIdGenerator: jest.fn().mockReturnValue(() => 'legendId'),
}));

jest.mock('../../../visualize/loader/pipeline_helpers/utilities', () => ({
  getTableAggs: jest.fn(),
}));
jest.mock('../../vis_filters', () => ({
  createFiltersFromEvent: jest.fn().mockReturnValue(['yes']),
}));

const vis = {
  params: {
    addLegend: true,
  },
  API: {
    events: {
      filter: jest.fn(),
    },
  },
};
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
};

const getWrapper = (props?: Partial<VisLegendProps>) =>
  mount(
    <I18nProvider>
      <VisLegend vis={vis} vislibVis={vislibVis} visData={visData} uiState={uiState} {...props} />
    </I18nProvider>
  );

const getLegendItems = (wrapper: ReactWrapper) => wrapper.find('.visLegend__value--item');

describe('VisLegend Component', () => {
  let wrapper: ReactWrapper;

  afterEach(() => {
    mockState.clear();
    jest.clearAllMocks();
  });

  describe('Legend open', () => {
    beforeEach(() => {
      mockState.set('vis.legendOpen', true);
      wrapper = getWrapper();
    });

    it('should match the snapshot', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('Legend closed', () => {
    beforeEach(() => {
      mockState.set('vis.legendOpen', false);
      wrapper = getWrapper();
    });

    it('should match the snapshot', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('Highlighting', () => {
    beforeEach(() => {
      wrapper = getWrapper();
    });

    it('should call highlight handler when legend item is focused', () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('focus');

      expect(vislibVis.handler.highlight).toHaveBeenCalledTimes(1);
    });

    it('should call highlight handler when legend item is hovered', () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('mouseEnter');

      expect(vislibVis.handler.highlight).toHaveBeenCalledTimes(1);
    });

    it('should call unHighlight handler when legend item is blurred', () => {
      let first = getLegendItems(wrapper).first();
      first.simulate('focus');
      first = getLegendItems(wrapper).first();
      first.simulate('blur');

      expect(vislibVis.handler.unHighlight).toHaveBeenCalledTimes(1);
    });

    it('should call unHighlight handler when legend item is unhovered', () => {
      const first = getLegendItems(wrapper).first();

      act(() => {
        first.simulate('mouseEnter');
        first.simulate('mouseLeave');
      });

      expect(vislibVis.handler.unHighlight).toHaveBeenCalledTimes(1);
    });

    it('should work with no handlers set', () => {
      const newVis = {
        ...vis,
        vislibVis: {
          ...vislibVis,
          handler: null,
        },
      };

      expect(() => {
        wrapper = getWrapper({ vis: newVis });
        const first = getLegendItems(wrapper).first();
        first.simulate('focus');
        first.simulate('blur');
      }).not.toThrow();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      wrapper = getWrapper();
    });

    it('should filter out when clicked', () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('click');
      const filterOut = wrapper.find('.visLegend__filterIn').first();
      filterOut.simulate('click');

      expect(vis.API.events.filter).toHaveBeenCalledWith({ data: ['valuesA'], negate: false });
      expect(vis.API.events.filter).toHaveBeenCalledTimes(1);
    });

    it('should filter in when clicked', () => {
      const first = getLegendItems(wrapper).first();
      first.simulate('click');
      const filterOut = wrapper.find('.visLegend__filterOut').first();
      filterOut.simulate('click');

      expect(vis.API.events.filter).toHaveBeenCalledWith({ data: ['valuesA'], negate: true });
      expect(vis.API.events.filter).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggles details', () => {
    beforeEach(() => {
      wrapper = getWrapper();
    });

    it('should show details when clicked', () => {
      let first = getLegendItems(wrapper).first();
      first.simulate('click');
      first = getLegendItems(wrapper).first();

      expect(first.exists('.visLegend__valueDetails')).toBe(true);
    });

    it('should hide details when escape is pressed', () => {
      let first = getLegendItems(wrapper).first();
      first.simulate('click');
      first = getLegendItems(wrapper).first();

      expect(first.exists('.visLegend__valueDetails')).toBe(true);

      first.simulate('keyDown', { keyCode: 27 });
      first = getLegendItems(wrapper).first();

      expect(first.exists('.visLegend__valueDetails')).toBe(false);
    });

    it('clicking different item should hide details', () => {
      let first = getLegendItems(wrapper).first();
      let last = getLegendItems(wrapper).last();
      first.simulate('click');

      first = getLegendItems(wrapper).first();

      expect(first.exists('.visLegend__valueDetails')).toBe(true);

      last.simulate('click');

      first = getLegendItems(wrapper).first();
      last = getLegendItems(wrapper).last();

      expect(first.exists('.visLegend__valueDetails')).toBe(false);
      expect(last.exists('.visLegend__valueDetails')).toBe(true);
    });
  });

  describe('setColor', () => {
    beforeEach(() => {
      wrapper = getWrapper();
    });

    it('sets the color in the UI state', () => {
      let first = getLegendItems(wrapper).first();
      first.simulate('click');

      first = getLegendItems(wrapper).first();
      const firstColor = first.find('.visLegend__valueColorPickerDot').first();
      firstColor.simulate('click');

      const colors = mockState.get('vis.colors');

      expect(colors.A).toBe(legendColors[0]);
    });
  });

  describe('toggleLegend function', () => {
    it('click should show legend once toggled from hidden', () => {
      mockState.set('vis.legendOpen', false);
      wrapper = getWrapper();
      const toggleButton = wrapper.find('.visLegend__toggle').first();
      toggleButton.simulate('click');

      expect(uiState.get('vis.legendOpen')).toBe(true);
    });

    it('click should hide legend once toggled from shown', () => {
      mockState.set('vis.legendOpen', true);
      wrapper = getWrapper();
      const toggleButton = wrapper.find('.visLegend__toggle').first();
      toggleButton.simulate('click');

      expect(uiState.get('vis.legendOpen')).toBe(false);
    });
  });
});
