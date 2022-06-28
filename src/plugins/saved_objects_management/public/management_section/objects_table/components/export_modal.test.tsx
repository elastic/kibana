/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
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
