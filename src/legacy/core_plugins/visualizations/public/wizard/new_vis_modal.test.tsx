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
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { NewVisModal } from './new_vis_modal';
import { VisType } from '..';
import { TypesStart } from '../np_ready/public/types';

jest.mock('../../../ui_metric/public', () => {
  return {
    createUiStatsReporter: () => {
      return () => {};
    },
    METRIC_TYPE: {
      CLICK: '',
    },
  };
});

jest.mock('../np_ready/public/services', () => {
  const mock = {
    getHttp: () => ({
      basePath: {
        prepend: jest.fn(path => `root${path}`),
      },
    }),
    getUISettings: () => ({
      get: jest.fn(),
    }),
    getTypes: () => {
      const defaultVisTypeParams = {
        hidden: false,
        visualization: class Controller {
          public render = jest.fn();
          public destroy = jest.fn();
        },
        requiresSearch: false,
        requestHandler: 'none',
        responseHandler: 'none',
      };
      const _visTypes = [
        { name: 'vis', title: 'Vis Type 1', stage: 'production', ...defaultVisTypeParams },
        {
          name: 'visExp',
          title: 'Experimental Vis',
          stage: 'experimental',
          ...defaultVisTypeParams,
        },
        {
          name: 'visWithSearch',
          title: 'Vis with search',
          stage: 'production',
          ...defaultVisTypeParams,
        },
        {
          name: 'visWithAliasUrl',
          title: 'Vis with alias Url',
          stage: 'production',
          aliasUrl: '/aliasUrl',
        },
      ];
      const visTypes: TypesStart = {
        get: (id: string) => {
          return _visTypes.find(vis => vis.name === id) as VisType;
        },
        all: () => {
          return _visTypes as VisType[];
        },
        getAliases: () => [],
      };
      return visTypes;
    },
  };

  return mock;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NewVisModal', () => {
  it('should render as expected', () => {
    const wrapper = mountWithIntl(<NewVisModal isOpen={true} onClose={() => null} />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should show a button for regular visualizations', () => {
    const wrapper = mountWithIntl(<NewVisModal isOpen={true} onClose={() => null} />);
    expect(wrapper.find('[data-test-subj="visType-vis"]').exists()).toBe(true);
  });

  describe('open editor', () => {
    it('should open the editor for visualizations without search', () => {
      window.location.assign = jest.fn();
      const wrapper = mountWithIntl(<NewVisModal isOpen={true} onClose={() => null} />);
      const visButton = wrapper.find('button[data-test-subj="visType-vis"]');
      visButton.simulate('click');
      expect(window.location.assign).toBeCalledWith('#/visualize/create?type=vis');
    });

    it('passes through editor params to the editor URL', () => {
      window.location.assign = jest.fn();
      const wrapper = mountWithIntl(
        <NewVisModal isOpen={true} onClose={() => null} editorParams={['foo=true', 'bar=42']} />
      );
      const visButton = wrapper.find('button[data-test-subj="visType-vis"]');
      visButton.simulate('click');
      expect(window.location.assign).toBeCalledWith('#/visualize/create?type=vis&foo=true&bar=42');
    });

    it('closes if visualization with aliasUrl and addToDashboard in editorParams', () => {
      const onClose = jest.fn();
      window.location.assign = jest.fn();
      const wrapper = mountWithIntl(
        <NewVisModal
          isOpen={true}
          onClose={onClose}
          editorParams={['foo=true', 'bar=42', 'addToDashboard']}
        />
      );
      const visButton = wrapper.find('button[data-test-subj="visType-visWithAliasUrl"]');
      visButton.simulate('click');
      expect(window.location.assign).toBeCalledWith('root/aliasUrl');
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('filter for visualization types', () => {
    it('should render as expected', () => {
      const wrapper = mountWithIntl(<NewVisModal isOpen={true} onClose={() => null} />);
      const searchBox = wrapper.find('input[data-test-subj="filterVisType"]');
      searchBox.simulate('change', { target: { value: 'with' } });
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe.skip('experimental visualizations', () => {
    it('should not show experimental visualizations if visualize:enableLabs is false', () => {
      // settingsGet.mockReturnValue(false);
      const wrapper = mountWithIntl(<NewVisModal isOpen={true} onClose={() => null} />);
      expect(wrapper.find('[data-test-subj="visType-visExp"]').exists()).toBe(false);
    });

    it('should show experimental visualizations if visualize:enableLabs is true', () => {
      // settingsGet.mockReturnValue(true);
      const wrapper = mountWithIntl(<NewVisModal isOpen={true} onClose={() => null} />);
      expect(wrapper.find('[data-test-subj="visType-visExp"]').exists()).toBe(true);
    });
  });
});
