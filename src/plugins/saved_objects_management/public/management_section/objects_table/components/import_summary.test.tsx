/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { ShallowWrapper } from 'enzyme';
import { shallowWithI18nProvider } from '@kbn/test/jest';
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
      expect.not.objectContaining({ values: expect.anything() }) // no importCount for singular
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
      expect.not.objectContaining({ values: expect.anything() }) // no importCount for singular
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
      expect.not.objectContaining({ values: expect.anything() }) // no importCount for singular
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
