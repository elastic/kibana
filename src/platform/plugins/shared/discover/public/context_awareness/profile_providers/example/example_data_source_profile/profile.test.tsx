/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProfileStateRegistry } from '../../../../../common/context_awareness';
import { EXAMPLE_PROFILE_STATE_DEF } from '../../../../../common/context_awareness';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';
import { createInMemoryContextAwarenessToolkit } from '../../../in_memory_toolkit';
import type { DataSourceProfileProviderParams } from '../../../profiles';
import { createExampleDataSourceProfileProvider } from './profile';

const EXAMPLE_DOC_VIEW_ID = 'doc_view_example';

const ESQL_PARAMS = {
  dataSource: createEsqlDataSource(),
  query: { esql: 'from my-example-logs | sort @timestamp desc' },
} as DataSourceProfileProviderParams;

const DATA_VIEW_PARAMS = {
  dataSource: createDataViewDataSource({ dataViewId: 'my-example-logs' }),
  dataView: buildDataViewMock({ id: 'my-example-logs', title: 'my-example-logs' }),
} as DataSourceProfileProviderParams;

/**
 * Discover hands the profile an already flattened record, and the two query modes flatten
 * differently: ES|QL yields scalars and no metadata fields, a data view search yields arrays plus
 * `_id`/`_index`/`_score`. The formatter has to reproduce whichever it is given verbatim, so both
 * shapes are exercised.
 */
const ESQL_FLATTENED = {
  '@timestamp': '2024-06-10T16:00:00.000Z',
  'agent.name': 'java',
  'data_stream.type': 'logs',
  'log.level': 'debug',
  message: 'This is a debug log',
  'service.name': 'product',
};

const DATA_VIEW_FLATTENED = {
  '@timestamp': ['2024-06-10T16:00:00.000Z'],
  'agent.name': ['java'],
  'data_stream.type': ['logs'],
  'log.level': ['debug'],
  message: ['This is a debug log'],
  'service.name': ['product'],
  _id: 'XdQFDpABfGznVC1bCHLo',
  _index: 'my-example-logs',
  _score: null,
};

const buildRecord = (flattened: Record<string, unknown>) =>
  ({ id: 'my-example-logs::1::', raw: {}, flattened } as unknown as DataTableRecord);

/**
 * Resolves the profile for the given params and returns its doc viewer, driven the way Discover
 * does: the resolved context carries the formatter, so the record formatting under test is the
 * profile's own rather than a stand-in.
 */
const resolveDocViewer = async (
  params: DataSourceProfileProviderParams,
  record: DataTableRecord
) => {
  const provider = createExampleDataSourceProfileProvider();
  const resolution = await provider.resolve(params);

  if (!resolution.isMatch) {
    throw new Error('Expected the example data source profile to match');
  }

  const profileStateRegistry = new ProfileStateRegistry();
  profileStateRegistry.registerDefinition(EXAMPLE_PROFILE_STATE_DEF);

  // Non-null assertion: accessors are optional on the profile type, this one is implemented here.
  const docViewer = provider.profile.getDocViewer!(
    () => ({ title: 'Previous profile', docViewsRegistry: (registry) => registry }),
    {
      context: resolution.context,
      toolkit: createInMemoryContextAwarenessToolkit({ profileStateRegistry }),
    } as never
  )({ record } as never);

  const registry = new DocViewsRegistry();
  docViewer.docViewsRegistry(registry);

  return { docViewer, registry };
};

const renderExampleDocView = async (
  params: DataSourceProfileProviderParams,
  record: DataTableRecord
) => {
  const { registry } = await resolveDocViewer(params, record);
  const exampleDocView = registry.getAll().find(({ id }) => id === EXAMPLE_DOC_VIEW_ID);

  if (!exampleDocView?.render) {
    throw new Error(`Expected the profile to register a '${EXAMPLE_DOC_VIEW_ID}' doc view`);
  }

  render(<>{exampleDocView.render({ hit: record } as unknown as DocViewRenderProps)}</>);
};

describe('createExampleDataSourceProfileProvider', () => {
  describe('getAdditionalCellActions', () => {
    const getActions = () => {
      const provider = createExampleDataSourceProfileProvider();

      // Non-null assertion: accessors are optional on the profile type, this one is implemented here.
      return provider.profile.getAdditionalCellActions!(() => [], {} as never)();
    };

    it('offers both actions for a column they are compatible with', async () => {
      const actions = getActions();
      const context = { field: { name: '@timestamp' } } as never;

      expect(actions.map(({ id }) => id)).toStrictEqual([
        'example-data-source-action',
        'another-example-data-source-action',
      ]);

      for (const action of actions) {
        // An action without `isCompatible` is compatible with everything.
        expect(await (action.isCompatible?.(context) ?? true)).toBe(true);
      }
    });

    it('withholds the action that declares itself incompatible with the message column', async () => {
      const actions = getActions();
      const context = { field: { name: 'message' } } as never;

      const [exampleAction, anotherExampleAction] = actions;
      expect(await (exampleAction.isCompatible?.(context) ?? true)).toBe(true);
      expect(await anotherExampleAction.isCompatible?.(context)).toBe(false);
    });
  });

  describe('getDocViewer', () => {
    it('renders the record formatted by the formatter from the resolved context (ES|QL)', async () => {
      await renderExampleDocView(ESQL_PARAMS, buildRecord(ESQL_FLATTENED));

      expect(screen.getByTestId('exampleDataSourceProfileDocViewRecord').textContent).toBe(
        JSON.stringify(ESQL_FLATTENED, null, 2)
      );
    });

    it('renders the record formatted by the formatter from the resolved context (data view)', async () => {
      await renderExampleDocView(DATA_VIEW_PARAMS, buildRecord(DATA_VIEW_FLATTENED));

      expect(screen.getByTestId('exampleDataSourceProfileDocViewRecord').textContent).toBe(
        JSON.stringify(DATA_VIEW_FLATTENED, null, 2)
      );
    });

    it('renders a custom header and footer previewing the record message', async () => {
      const record = buildRecord(ESQL_FLATTENED);
      const { docViewer } = await resolveDocViewer(ESQL_PARAMS, record);
      const props = { hit: record } as unknown as DocViewRenderProps;

      render(
        <>
          {docViewer.renderHeader?.(props)}
          {docViewer.renderFooter?.(props)}
        </>
      );

      expect(screen.getByTestId('exampleCustomDocViewerHeader')).toHaveTextContent(
        'This is a debug log'
      );
      expect(screen.getByTestId('exampleCustomDocViewerFooter')).toHaveTextContent(
        'This is a debug log'
      );
    });

    it('truncates a long message preview in the custom header and footer', async () => {
      const message = 'a'.repeat(150);
      const record = buildRecord({ ...ESQL_FLATTENED, message });
      const { docViewer } = await resolveDocViewer(ESQL_PARAMS, record);
      const props = { hit: record } as unknown as DocViewRenderProps;

      render(
        <>
          {docViewer.renderHeader?.(props)}
          {docViewer.renderFooter?.(props)}
        </>
      );

      for (const testSubj of ['exampleCustomDocViewerHeader', 'exampleCustomDocViewerFooter']) {
        expect(screen.getByTestId(testSubj)).toHaveTextContent(`${'a'.repeat(100)}...`);
        expect(screen.getByTestId(testSubj)).not.toHaveTextContent(message);
      }
    });
  });
});
