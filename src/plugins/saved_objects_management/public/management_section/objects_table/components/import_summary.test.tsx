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
import { ShallowWrapper } from 'enzyme';
import { shallowWithI18nProvider } from 'test_utils/enzyme_helpers';
import { ImportSummary, ImportSummaryProps } from './import_summary';
import { FailedImport } from '../../../lib';

// @ts-expect-error
import { findTestSubject } from '@elastic/eui/lib/test';

describe('ImportSummary', () => {
  const errorUnsupportedType: FailedImport = {
    obj: { type: 'error-obj-type', id: 'error-obj-id', meta: { title: 'Error object' } },
    error: { type: 'unsupported_type' },
  };
  const successNew = { type: 'dashboard', id: 'dashboard-id', meta: { title: 'New' } };
  const successOverwritten = {
    type: 'visualization',
    id: 'viz-id',
    meta: { title: 'Overwritten' },
    overwrite: true,
  };

  const findHeader = (wrapper: ShallowWrapper) => wrapper.find('h3');
  const findCountCreated = (wrapper: ShallowWrapper) =>
    wrapper.find('h4.savedObjectsManagementImportSummary__createdCount');
  const findCountOverwritten = (wrapper: ShallowWrapper) =>
    wrapper.find('h4.savedObjectsManagementImportSummary__overwrittenCount');
  const findCountError = (wrapper: ShallowWrapper) =>
    wrapper.find('h4.savedObjectsManagementImportSummary__errorCount');
  const findObjectRow = (wrapper: ShallowWrapper) =>
    wrapper.find('.savedObjectsManagementImportSummary__row');

  it('should render as expected with no results', async () => {
    const props: ImportSummaryProps = { failedImports: [], successfulImports: [] };
    const wrapper = shallowWithI18nProvider(<ImportSummary {...props} />);

    expect(findHeader(wrapper).childAt(0).props()).toEqual(
      expect.objectContaining({ values: { importCount: 0 } })
    );
    expect(findCountCreated(wrapper)).toHaveLength(0);
    expect(findCountOverwritten(wrapper)).toHaveLength(0);
    expect(findCountError(wrapper)).toHaveLength(0);
    expect(findObjectRow(wrapper)).toHaveLength(0);
  });

  it('should render as expected with a newly created object', async () => {
    const props: ImportSummaryProps = {
      failedImports: [],
      successfulImports: [successNew],
    };
    const wrapper = shallowWithI18nProvider(<ImportSummary {...props} />);

    expect(findHeader(wrapper).childAt(0).props()).toEqual(
      expect.objectContaining({ values: { importCount: 1 } })
    );
    const countCreated = findCountCreated(wrapper);
    expect(countCreated).toHaveLength(1);
    expect(countCreated.childAt(0).props()).toEqual(
      expect.objectContaining({ values: { createdCount: 1 } })
    );
    expect(findCountOverwritten(wrapper)).toHaveLength(0);
    expect(findCountError(wrapper)).toHaveLength(0);
    expect(findObjectRow(wrapper)).toHaveLength(1);
  });

  it('should render as expected with an overwritten object', async () => {
    const props: ImportSummaryProps = {
      failedImports: [],
      successfulImports: [successOverwritten],
    };
    const wrapper = shallowWithI18nProvider(<ImportSummary {...props} />);

    expect(findHeader(wrapper).childAt(0).props()).toEqual(
      expect.objectContaining({ values: { importCount: 1 } })
    );
    expect(findCountCreated(wrapper)).toHaveLength(0);
    const countOverwritten = findCountOverwritten(wrapper);
    expect(countOverwritten).toHaveLength(1);
    expect(countOverwritten.childAt(0).props()).toEqual(
      expect.objectContaining({ values: { overwrittenCount: 1 } })
    );
    expect(findCountError(wrapper)).toHaveLength(0);
    expect(findObjectRow(wrapper)).toHaveLength(1);
  });

  it('should render as expected with an error object', async () => {
    const props: ImportSummaryProps = {
      failedImports: [errorUnsupportedType],
      successfulImports: [],
    };
    const wrapper = shallowWithI18nProvider(<ImportSummary {...props} />);

    expect(findHeader(wrapper).childAt(0).props()).toEqual(
      expect.objectContaining({ values: { importCount: 1 } })
    );
    expect(findCountCreated(wrapper)).toHaveLength(0);
    expect(findCountOverwritten(wrapper)).toHaveLength(0);
    const countError = findCountError(wrapper);
    expect(countError).toHaveLength(1);
    expect(countError.childAt(0).props()).toEqual(
      expect.objectContaining({ values: { errorCount: 1 } })
    );
    expect(findObjectRow(wrapper)).toHaveLength(1);
  });

  it('should render as expected with mixed objects', async () => {
    const props: ImportSummaryProps = {
      failedImports: [errorUnsupportedType],
      successfulImports: [successNew, successOverwritten],
    };
    const wrapper = shallowWithI18nProvider(<ImportSummary {...props} />);

    expect(findHeader(wrapper).childAt(0).props()).toEqual(
      expect.objectContaining({ values: { importCount: 3 } })
    );
    const countCreated = findCountCreated(wrapper);
    expect(countCreated).toHaveLength(1);
    expect(countCreated.childAt(0).props()).toEqual(
      expect.objectContaining({ values: { createdCount: 1 } })
    );
    const countOverwritten = findCountOverwritten(wrapper);
    expect(countOverwritten).toHaveLength(1);
    expect(countOverwritten.childAt(0).props()).toEqual(
      expect.objectContaining({ values: { overwrittenCount: 1 } })
    );
    const countError = findCountError(wrapper);
    expect(countError).toHaveLength(1);
    expect(countError.childAt(0).props()).toEqual(
      expect.objectContaining({ values: { errorCount: 1 } })
    );
    expect(findObjectRow(wrapper)).toHaveLength(3);
  });
});
