/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { FetchStatus } from '../../../types';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import { internalStateActions, selectTabRuntimeState } from '../../state_management/redux';
import { GroupSimilarMessagesButton } from './group_similar_messages_button';

const createColumn = (name: string, esType: string): DatatableColumn => ({
  id: name,
  name,
  meta: { type: esType === 'long' ? 'number' : 'string', esType },
});

const MESSAGE_COLUMN = createColumn('message', 'text');

const setup = async ({
  esql = 'FROM logs-* | WHERE service.name == "checkout" | LIMIT 1000',
  sourceEsql = esql,
  resultColumns = [MESSAGE_COLUMN],
  fetchStatus = FetchStatus.COMPLETE,
  licenseType = 'platinum',
}: {
  esql?: string;
  sourceEsql?: string;
  resultColumns?: DatatableColumn[];
  fetchStatus?: FetchStatus;
  licenseType?: 'platinum' | 'basic';
} = {}) => {
  const services = createDiscoverServicesMock();
  const licensing = licensingMock.createStart();
  licensing.license$ = new BehaviorSubject(
    licensingMock.createLicense({ license: { type: licenseType } })
  );
  services.licensing = licensing;
  const toolkit = getDiscoverInternalStateMock({ services });
  await toolkit.initializeTabs();
  const tabId = toolkit.getCurrentTab().id;
  toolkit.internalState.dispatch(
    internalStateActions.updateAppState({
      tabId,
      appState: { query: { esql } },
    })
  );
  await toolkit.initializeSingleTab({ tabId, skipWaitForDataFetching: true });
  const { scopedEbtManager$ } = selectTabRuntimeState(toolkit.runtimeStateManager, tabId);
  const trackClick = jest.spyOn(scopedEbtManager$.getValue(), 'trackGroupSimilarMessagesClick');
  toolkit.getCurrentTabDataStateContainer().data$.documents$.next({
    dataSource: createMockEsqlSource([], resultColumns, undefined, sourceEsql),
    fetchStatus,
  });
  renderWithKibanaRenderContext(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <GroupSimilarMessagesButton />
    </DiscoverToolkitTestProvider>
  );
  return { toolkit, trackClick };
};

describe('GroupSimilarMessagesButton', () => {
  it('groups the current results by message and tracks one click', async () => {
    const { toolkit, trackClick } = await setup();
    const button = screen.getByRole('button', { name: 'Find patterns in message' });
    expect(button).toHaveTextContent('Find patterns in message');
    expect(button).toHaveAttribute('title', '');
    await userEvent.hover(button);
    expect(
      await screen.findByText('Group message by pattern to spot trends and anomalies.')
    ).toBeVisible();
    await userEvent.click(button);
    expect(toolkit.getCurrentTab().appState.query).toEqual({
      esql: 'FROM logs-* | WHERE service.name == "checkout" | LIMIT 1000\n  | STATS count = COUNT(*) BY pattern = CATEGORIZE(message)\n  | SORT count DESC',
    });
    expect(trackClick).toHaveBeenCalledTimes(1);
  });

  it.each([
    { columns: ['event.original', 'error.message', 'message'], field: 'message' },
    { columns: ['event.original', 'error.message'], field: 'error.message' },
    { columns: ['summary', 'event.original'], field: 'event.original' },
    { columns: ['_id', 'summary', 'details'], field: 'summary' },
  ])('groups by $field from the returned text columns', async ({ columns, field }) => {
    const { toolkit } = await setup({
      resultColumns: columns.map((name) => createColumn(name, 'match_only_text')),
    });
    const button = screen.getByRole('button', { name: `Find patterns in ${field}` });
    await userEvent.hover(button);
    expect(
      await screen.findByText(`Group ${field} by pattern to spot trends and anomalies.`)
    ).toBeVisible();
    await userEvent.click(button);
    expect(toolkit.getCurrentTab().appState.query).toEqual({
      esql: expect.stringContaining(`CATEGORIZE(${field})`),
    });
  });

  it('hides the action below the CATEGORIZE license level', async () => {
    await setup({ licenseType: 'basic' });
    expect(screen.queryByTestId('dscGroupSimilarMessagesButton')).not.toBeInTheDocument();
  });

  it.each([
    { resultColumns: [createColumn('message', 'keyword'), createColumn('_id', 'text')] },
    { resultColumns: [createColumn('message', 'long')] },
    { sourceEsql: 'FROM other-logs' },
    { fetchStatus: FetchStatus.LOADING },
  ])('hides the action without current message results (%j)', async (options) => {
    await setup(options);
    expect(screen.queryByTestId('dscGroupSimilarMessagesButton')).not.toBeInTheDocument();
  });
});
