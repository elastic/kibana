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
import { ExportModal } from './export_modal';

describe('ExportModal', () => {
  let onExport: jest.Mock;
  let onCancel: jest.Mock;
  let onSelectedOptionsChange: jest.Mock;
  let onIncludeReferenceChange: jest.Mock;

  const options = [
    { id: '1', label: 'option 1' },
    { id: '2', label: 'option 2' },
  ];
  const selectedOptions = {
    1: true,
    2: false,
  };

  beforeEach(() => {
    onExport = jest.fn();
    onCancel = jest.fn();
    onSelectedOptionsChange = jest.fn();
    onIncludeReferenceChange = jest.fn();
  });

  it('Displays a checkbox for each option', () => {
    const wrapper = mountWithIntl(
      <ExportModal
        onExport={onExport}
        onCancel={onCancel}
        onSelectedOptionsChange={onSelectedOptionsChange}
        filteredItemCount={42}
        options={options}
        selectedOptions={selectedOptions}
        includeReferences={false}
        onIncludeReferenceChange={onIncludeReferenceChange}
      />
    );

    expect(wrapper.find('EuiCheckbox')).toHaveLength(2);
  });

  it('calls `onCancel` when clicking on the cancel button', () => {
    const wrapper = mountWithIntl(
      <ExportModal
        onExport={onExport}
        onCancel={onCancel}
        onSelectedOptionsChange={onSelectedOptionsChange}
        filteredItemCount={42}
        options={options}
        selectedOptions={selectedOptions}
        includeReferences={false}
        onIncludeReferenceChange={onIncludeReferenceChange}
      />
    );
    wrapper.find('EuiButtonEmpty').simulate('click');

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onExport).not.toHaveBeenCalled();
  });

  it('calls `onExport` when clicking on the export button', () => {
    const wrapper = mountWithIntl(
      <ExportModal
        onExport={onExport}
        onCancel={onCancel}
        onSelectedOptionsChange={onSelectedOptionsChange}
        filteredItemCount={42}
        options={options}
        selectedOptions={selectedOptions}
        includeReferences={false}
        onIncludeReferenceChange={onIncludeReferenceChange}
      />
    );
    wrapper.find('EuiButton').simulate('click');

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});
