/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithI18nProvider } from '@kbn/test-jest-helpers';
import { httpServiceMock } from '../../../../../../core/public/mocks';
import { ImportSummary, ImportSummaryProps } from './import_summary';
import { FailedImport } from '../../../lib';

// @ts-expect-error
import { findTestSubject } from '@elastic/eui/lib/test';

describe('ImportSummary', () => {
  let basePath: ReturnType<typeof httpServiceMock.createBasePath>;

  const getProps = (parts: Partial<ImportSummaryProps>): ImportSummaryProps => ({
    basePath,
    failedImports: [],
    successfulImports: [],
    importWarnings: [],
    allowedTypes: [],
    ...parts,
  });

  beforeEach(() => {
    basePath = httpServiceMock.createBasePath();
  });

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

  const findHeader = (wrapper: ReactWrapper) => wrapper.find('h3');
  const findCountCreated = (wrapper: ReactWrapper) =>
    wrapper.find('h4.savedObjectsManagementImportSummary__createdCount');
  const findCountOverwritten = (wrapper: ReactWrapper) =>
    wrapper.find('h4.savedObjectsManagementImportSummary__overwrittenCount');
  const findCountError = (wrapper: ReactWrapper) =>
    wrapper.find('h4.savedObjectsManagementImportSummary__errorCount');
  const findObjectRow = (wrapper: ReactWrapper) =>
    wrapper.find('.savedObjectsManagementImportSummary__row').hostNodes();
  const findWarnings = (wrapper: ReactWrapper) => wrapper.find('ImportWarning');

  it('should render as expected with no results', async () => {
    const props = getProps({ failedImports: [], successfulImports: [] });
    const wrapper = mountWithI18nProvider(<ImportSummary {...props} />);

    expect(findHeader(wrapper).childAt(0).props()).toEqual(
      expect.objectContaining({ values: { importCount: 0 } })
    );
    expect(findCountCreated(wrapper)).toHaveLength(0);
    expect(findCountOverwritten(wrapper)).toHaveLength(0);
    expect(findCountError(wrapper)).toHaveLength(0);
    expect(findObjectRow(wrapper)).toHaveLength(0);
  });

  it('should render as expected with a newly created object', async () => {
    const props = getProps({
      failedImports: [],
      successfulImports: [successNew],
    });
    const wrapper = mountWithI18nProvider(<ImportSummary {...props} />);

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
    const props = getProps({
      failedImports: [],
      successfulImports: [successOverwritten],
    });
    const wrapper = mountWithI18nProvider(<ImportSummary {...props} />);

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
    const props = getProps({
      failedImports: [errorUnsupportedType],
      successfulImports: [],
    });
    const wrapper = mountWithI18nProvider(<ImportSummary {...props} />);

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
    const props = getProps({
      failedImports: [errorUnsupportedType],
      successfulImports: [successNew, successOverwritten],
    });
    const wrapper = mountWithI18nProvider(<ImportSummary {...props} />);

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

  it('should render warnings when present', async () => {
    const props = getProps({
      successfulImports: [successNew],
      importWarnings: [
        {
          type: 'simple',
          message: 'foo',
        },
        {
          type: 'action_required',
          message: 'bar',
          actionPath: '/app/lost',
        },
      ],
    });
    const wrapper = mountWithI18nProvider(<ImportSummary {...props} />);

    expect(findWarnings(wrapper)).toHaveLength(2);
  });
});
