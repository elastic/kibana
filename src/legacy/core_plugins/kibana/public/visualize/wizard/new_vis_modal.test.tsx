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

import { settingsGet } from './new_vis_modal.test.mocks';

import { NewVisModal } from './new_vis_modal';

import { VisType } from 'ui/vis';

describe('NewVisModal', () => {
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
  const visTypes: VisType[] = [
    { name: 'vis', title: 'Vis Type 1', stage: 'production', ...defaultVisTypeParams },
    { name: 'visExp', title: 'Experimental Vis', stage: 'experimental', ...defaultVisTypeParams },
    {
      name: 'visWithSearch',
      title: 'Vis with search',
      stage: 'production',
      ...defaultVisTypeParams,
    },
  ];

  it('should render as expected', () => {
    const wrapper = mountWithIntl(
      <NewVisModal isOpen={true} onClose={() => null} visTypesRegistry={visTypes} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should show a button for regular visualizations', () => {
    const wrapper = mountWithIntl(
      <NewVisModal isOpen={true} onClose={() => null} visTypesRegistry={visTypes} />
    );
    expect(wrapper.find('[data-test-subj="visType-vis"]').exists()).toBe(true);
  });

  describe('open editor', () => {
    it('should open the editor for visualizations without search', () => {
      window.location.assign = jest.fn();
      const wrapper = mountWithIntl(
        <NewVisModal isOpen={true} onClose={() => null} visTypesRegistry={visTypes} />
      );
      const visButton = wrapper.find('button[data-test-subj="visType-vis"]');
      visButton.simulate('click');
      expect(window.location.assign).toBeCalledWith('#/visualize/create?type=vis');
    });

    it('passes through editor params to the editor URL', () => {
      window.location.assign = jest.fn();
      const wrapper = mountWithIntl(
        <NewVisModal
          isOpen={true}
          onClose={() => null}
          visTypesRegistry={visTypes}
          editorParams={['foo=true', 'bar=42']}
        />
      );
      const visButton = wrapper.find('button[data-test-subj="visType-vis"]');
      visButton.simulate('click');
      expect(window.location.assign).toBeCalledWith('#/visualize/create?type=vis&foo=true&bar=42');
    });
  });

  describe('filter for visualization types', () => {
    it('should render as expected', () => {
      const wrapper = mountWithIntl(
        <NewVisModal isOpen={true} onClose={() => null} visTypesRegistry={visTypes} />
      );
      const searchBox = wrapper.find('input[data-test-subj="filterVisType"]');
      searchBox.simulate('change', { target: { value: 'with' } });
      expect(wrapper).toMatchSnapshot();
    });
  });

  describe('experimental visualizations', () => {
    it('should not show experimental visualizations if visualize:enableLabs is false', () => {
      settingsGet.mockReturnValue(false);
      const wrapper = mountWithIntl(
        <NewVisModal isOpen={true} onClose={() => null} visTypesRegistry={visTypes} />
      );
      expect(wrapper.find('[data-test-subj="visType-visExp"]').exists()).toBe(false);
    });

    it('should show experimental visualizations if visualize:enableLabs is true', () => {
      settingsGet.mockReturnValue(true);
      const wrapper = mountWithIntl(
        <NewVisModal isOpen={true} onClose={() => null} visTypesRegistry={visTypes} />
      );
      expect(wrapper.find('[data-test-subj="visType-visExp"]').exists()).toBe(true);
    });
  });
});
