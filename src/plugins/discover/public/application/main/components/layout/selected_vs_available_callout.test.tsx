/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { SelectedVSAvailableCallout } from './selected_vs_available_callout';

describe('SelectedVSAvailableCallout', () => {
  it('should render the callout if isPlainRecord is true and the selected columns are less than the available ones', async () => {
    const component = mountWithIntl(
      <SelectedVSAvailableCallout
        isPlainRecord={true}
        textBasedQueryColumns={
          [
            { id: '1', name: 'extension', meta: { type: 'text' } },
            { id: '2', name: 'bytes', meta: { type: 'number' } },
            { id: '3', name: '@timestamp', meta: { type: 'date' } },
          ] as DatatableColumn[]
        }
        selectedColumns={['bytes']}
      />
    );
    expect(component.find('[data-test-subj="dscSelectedColumnsCallout"]').exists()).toBe(true);
  });

  it('should not render the callout if isPlainRecord is false', async () => {
    const component = mountWithIntl(
      <SelectedVSAvailableCallout
        isPlainRecord={false}
        textBasedQueryColumns={undefined}
        selectedColumns={['bytes']}
      />
    );
    expect(component.find('[data-test-subj="dscSelectedColumnsCallout"]').exists()).toBe(false);
  });

  it('should not render the callout if isPlainRecord is true but the selected columns are equal with the available ones', async () => {
    const component = mountWithIntl(
      <SelectedVSAvailableCallout
        isPlainRecord={true}
        textBasedQueryColumns={
          [{ id: '2', name: 'bytes', meta: { type: 'number' } }] as DatatableColumn[]
        }
        selectedColumns={['bytes']}
      />
    );
    expect(component.find('[data-test-subj="dscSelectedColumnsCallout"]').exists()).toBe(false);
  });
});
