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
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { LicenseType } from '@kbn/licensing-types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { ESQL_CATEGORIZE_PRODUCT_FEATURE_ID } from '../../../../../common/constants';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { DiscoverToolkitTestProvider } from '../../../../__mocks__/test_provider';
import {
  internalStateActions,
  selectTab,
  selectTabRuntimeState,
} from '../../state_management/redux';
import { GroupSimilarMessagesButton } from './group_similar_messages_button';

const MESSAGE_COLUMN: DatatableColumn = {
  id: 'message',
  name: 'message',
  meta: { type: 'string' },
};

const setup = async ({
  esql = 'FROM logs-* | LIMIT 1000',
  resultColumns = [MESSAGE_COLUMN],
  licenseType = 'platinum',
  isProductFeatureAvailable = true,
}: {
  esql?: string;
  resultColumns?: DatatableColumn[];
  licenseType?: LicenseType;
  isProductFeatureAvailable?: boolean;
} = {}) => {
  const services = createDiscoverServicesMock();
  const licensing = licensingMock.createStart();
  licensing.license$ = new BehaviorSubject(
    licensingMock.createLicense({ license: { type: licenseType } })
  );
  services.licensing = licensing;
  services.core.pricing.isFeatureAvailable = jest.fn(
    (featureId: string) =>
      featureId !== ESQL_CATEGORIZE_PRODUCT_FEATURE_ID || isProductFeatureAvailable
  );

  const toolkit = getDiscoverInternalStateMock({ services });
  await toolkit.initializeTabs();
  const tabId = toolkit.getCurrentTab().id;
  toolkit.internalState.dispatch(
    internalStateActions.updateAppState({ tabId, appState: { query: { esql } } })
  );
  await toolkit.initializeSingleTab({ tabId, skipWaitForDataFetching: true });

  const { currentDataSource$, scopedEbtManager$ } = selectTabRuntimeState(
    toolkit.runtimeStateManager,
    tabId
  );
  const trackEsqlCategorizeEvent = jest.spyOn(
    scopedEbtManager$.getValue(),
    'trackEsqlCategorizeEvent'
  );

  renderWithKibanaRenderContext(
    <DiscoverToolkitTestProvider toolkit={toolkit}>
      <GroupSimilarMessagesButton />
    </DiscoverToolkitTestProvider>
  );

  act(() => {
    currentDataSource$.next(createMockEsqlSource([], resultColumns, undefined, esql));
  });

  const getQuery = () => selectTab(toolkit.internalState.getState(), tabId).appState.query;

  return { getQuery, trackEsqlCategorizeEvent };
};

describe('GroupSimilarMessagesButton', () => {
  it('rewrites the query to group messages by pattern and tracks the click', async () => {
    const { getQuery, trackEsqlCategorizeEvent } = await setup();

    await userEvent.click(screen.getByTestId('dscGroupSimilarMessagesButton'));

    expect(getQuery()).toEqual({
      esql: 'FROM logs-*\n| STATS Count = COUNT(*) BY Pattern = CATEGORIZE(message)\n| SORT Count DESC',
    });
    expect(trackEsqlCategorizeEvent).toHaveBeenCalledWith({
      eventName: 'group_similar_messages_clicked',
      fieldName: 'message',
    });
  });

  it('is not rendered without a message column', async () => {
    await setup({
      resultColumns: [{ id: 'host.name', name: 'host.name', meta: { type: 'string' } }],
    });

    expect(screen.queryByTestId('dscGroupSimilarMessagesButton')).not.toBeInTheDocument();
  });

  it('is not rendered when message is not a string column', async () => {
    await setup({
      resultColumns: [{ id: 'message', name: 'message', meta: { type: 'number' } }],
    });

    expect(screen.queryByTestId('dscGroupSimilarMessagesButton')).not.toBeInTheDocument();
  });

  it('is not rendered when the query already aggregates', async () => {
    await setup({ esql: 'FROM logs-* | STATS BY message' });

    expect(screen.queryByTestId('dscGroupSimilarMessagesButton')).not.toBeInTheDocument();
  });

  it('is not rendered for TS queries', async () => {
    await setup({ esql: 'TS metrics-* | LIMIT 10' });

    expect(screen.queryByTestId('dscGroupSimilarMessagesButton')).not.toBeInTheDocument();
  });

  it('is not rendered below a platinum license', async () => {
    await setup({ licenseType: 'basic' });

    expect(screen.queryByTestId('dscGroupSimilarMessagesButton')).not.toBeInTheDocument();
  });

  it('is not rendered when the pricing tier does not include the ES|QL categorize feature', async () => {
    await setup({ isProductFeatureAvailable: false });

    expect(screen.queryByTestId('dscGroupSimilarMessagesButton')).not.toBeInTheDocument();
  });
});
