/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DocView, DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { createProfileProviderSharedServicesMock } from '../../../../__mocks__';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../../toolkit';
import type { LogOverviewContext } from '../../logs_data_source_profile/profile';
import { createGetDocViewer } from './get_doc_viewer';

const mockOpenAndScrollToSection = jest.fn();
// Stable across renders: the profile stores the handle in state, so a fresh object each render
// would loop.
const mockLogsOverviewApi = { openAndScrollToSection: mockOpenAndScrollToSection };

// The accordion is opened through the imperative handle the logs-overview component hands back, so
// the stub only needs to surrender a ref; what it renders is not this accessor's concern.
jest.mock('@kbn/unified-doc-viewer-plugin/public', () => {
  const actualReact: typeof React = jest.requireActual('react');

  return {
    UnifiedDocViewerLogsOverview: actualReact.forwardRef((_props, ref) => {
      actualReact.useImperativeHandle(ref, () => mockLogsOverviewApi, []);

      return null;
    }),
  };
});

const LOGS_OVERVIEW_TAB_ID = 'doc_view_logs_overview';

const buildRecord = (id: string) =>
  buildDataTableRecord(
    { _id: id, _index: 'logs-synth.docviewer-default', fields: { 'log.level': ['info'] } },
    dataViewMock
  );

const buildDocViewer = (
  logOverviewContext$: BehaviorSubject<LogOverviewContext | undefined>,
  prevDocViews: DocView[] = []
) => {
  const registry = new DocViewsRegistry();

  // Non-null assertion: accessors are optional on the profile type, this one is implemented here.
  const docViewer = createGetDocViewer(createProfileProviderSharedServicesMock())!(
    () => ({
      title: 'Previous profile',
      docViewsRegistry: (prevRegistry: DocViewsRegistry) => {
        prevDocViews.forEach((docView) => prevRegistry.add(docView));
        return prevRegistry;
      },
    }),
    {
      context: { logOverviewContext$ },
      toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
    } as never
  )({} as never);

  docViewer.docViewsRegistry(registry);

  const logsOverviewTab = registry.getAll().find(({ id }) => id === LOGS_OVERVIEW_TAB_ID);
  if (!logsOverviewTab?.render) {
    throw new Error(`Expected the profile to register a '${LOGS_OVERVIEW_TAB_ID}' doc view`);
  }

  const renderTab = (record: ReturnType<typeof buildRecord>) =>
    logsOverviewTab.render!({ hit: record } as unknown as DocViewRenderProps);

  return { registry, renderTab };
};

describe('createGetDocViewer (logs) accordion expansion', () => {
  beforeEach(() => {
    mockOpenAndScrollToSection.mockClear();
  });

  it('registers the log overview tab ahead of tabs from the preceding profile', () => {
    const logOverviewContext$ = new BehaviorSubject<LogOverviewContext | undefined>(undefined);
    // Ids and orders mirror the core doc views in `unified_doc_viewer/public/plugin.tsx`, so this
    // is the ordering a log document actually gets — and the reason the flyout opens on Log
    // overview rather than on the table.
    const { registry } = buildDocViewer(logOverviewContext$, [
      { id: 'doc_view_table', title: 'Table', order: 10, render: () => <div /> },
      { id: 'doc_view_source', title: 'JSON', order: 20, render: () => <div /> },
    ]);

    expect(registry.getAll().map(({ id }) => id)).toEqual([
      LOGS_OVERVIEW_TAB_ID,
      'doc_view_table',
      'doc_view_source',
    ]);
  });

  it('opens the section queued on the context when the tab mounts', async () => {
    const record = buildRecord('doc-1');
    const logOverviewContext$ = new BehaviorSubject<LogOverviewContext | undefined>({
      recordId: record.id,
      initialAccordionSection: 'stacktrace',
    });
    const { renderTab } = buildDocViewer(logOverviewContext$);

    render(<>{renderTab(record)}</>);

    await waitFor(() => expect(mockOpenAndScrollToSection).toHaveBeenCalledWith('stacktrace'));
    // Consumed, so a remount does not reopen it.
    expect(logOverviewContext$.getValue()).toBeUndefined();
  });

  // `openAndScrollToSection` only ever opens, never closes, so each ordering starts the hook from a
  // different section and the pair covers both arms.
  const directions = [
    { first: 'stacktrace', second: 'quality_issues' },
    { first: 'quality_issues', second: 'stacktrace' },
  ] as const;

  directions.forEach(({ first, second }) => {
    it(`keeps ${first} open when ${second} is requested for the same record`, async () => {
      const record = buildRecord('doc-1');
      const logOverviewContext$ = new BehaviorSubject<LogOverviewContext | undefined>({
        recordId: record.id,
        initialAccordionSection: first,
      });
      const { renderTab } = buildDocViewer(logOverviewContext$);

      render(<>{renderTab(record)}</>);
      await waitFor(() => expect(mockOpenAndScrollToSection).toHaveBeenCalledWith(first));

      logOverviewContext$.next({ recordId: record.id, initialAccordionSection: second });

      // Both sections were opened on the same mounted component, which is what keeps the first one
      // expanded in the browser — a remount would have reset it.
      await waitFor(() => expect(mockOpenAndScrollToSection).toHaveBeenCalledWith(second));
      expect(mockOpenAndScrollToSection).toHaveBeenCalledTimes(2);
      expect(logOverviewContext$.getValue()).toBeUndefined();
    });

    it(`leaves a ${second} request for the tab that mounts for a different record`, async () => {
      const record = buildRecord('doc-1');
      const otherRecordId = buildRecord('doc-2').id;
      const logOverviewContext$ = new BehaviorSubject<LogOverviewContext | undefined>({
        recordId: record.id,
        initialAccordionSection: first,
      });
      const { renderTab } = buildDocViewer(logOverviewContext$);

      render(<>{renderTab(record)}</>);
      await waitFor(() => expect(mockOpenAndScrollToSection).toHaveBeenCalledWith(first));

      logOverviewContext$.next({ recordId: otherRecordId, initialAccordionSection: second });

      // The request survives for whichever tab mounts next. That remount is keyed on the record id
      // inside the doc viewer itself, so only a browser test can prove it happens.
      expect(mockOpenAndScrollToSection).toHaveBeenCalledTimes(1);
      expect(logOverviewContext$.getValue()).toEqual({
        recordId: otherRecordId,
        initialAccordionSection: second,
      });
    });
  });
});
