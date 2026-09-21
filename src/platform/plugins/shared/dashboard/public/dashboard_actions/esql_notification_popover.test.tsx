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
import type { AggregateQuery } from '@kbn/es-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { I18nProvider } from '@kbn/i18n-react';
import type { EsqlNotificationActionApi } from './esql_notification_action';
import { EsqlNotificationPopover } from './esql_notification_popover';

const makeApi = (queries: AggregateQuery[] = []): EsqlNotificationActionApi => ({
  uuid: 'testId',
  esql$: new BehaviorSubject<AggregateQuery[]>(queries),
  approximationApplied$: new BehaviorSubject<boolean | undefined>(undefined),
});

const renderPopover = (api: EsqlNotificationActionApi) =>
  render(
    <I18nProvider>
      <EsqlNotificationPopover api={api} />
    </I18nProvider>
  );

const openPopover = async (api: EsqlNotificationActionApi) => {
  renderPopover(api);
  await userEvent.click(await screen.findByTestId(`embeddablePanelEsqlNotification-${api.uuid}`));
  await waitForEuiPopoverOpen();
};

describe('esql notification popover', () => {
  it('renders nothing when there are no esql queries', () => {
    const { container } = renderPopover(makeApi([]));
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the trigger button when there are queries', async () => {
    const api = makeApi([{ esql: 'FROM logs' }]);
    renderPopover(api);
    expect(
      await screen.findByTestId(`embeddablePanelEsqlNotification-${api.uuid}`)
    ).toBeInTheDocument();
  });

  it('renders a code block for each query after opening', async () => {
    const api = makeApi([{ esql: 'FROM logs' }, { esql: 'FROM metrics' }]);
    await openPopover(api);
    expect(screen.getByTestId('esqlNotificationPopover__query-0')).toBeInTheDocument();
    expect(screen.getByTestId('esqlNotificationPopover__query-1')).toBeInTheDocument();
  });

  it('displays the esql query string in the code block', async () => {
    const api = makeApi([{ esql: 'FROM logs | LIMIT 10' }]);
    await openPopover(api);
    expect(screen.getByTestId('esqlNotificationPopover__query-0')).toHaveTextContent(
      'FROM logs | LIMIT 10'
    );
  });

  it('locks hover actions when opening the popover', async () => {
    const lockHoverActions = jest.fn();
    const api = {
      ...makeApi([{ esql: 'FROM logs' }]),
      lockHoverActions,
      hasLockedHoverActions$: new BehaviorSubject(false),
    };
    await openPopover(api);
    expect(lockHoverActions).toHaveBeenCalledWith(true);
  });

  it('unlocks hover actions when closing the popover via the toggle button', async () => {
    const hasLockedHoverActions$ = new BehaviorSubject(false);
    const lockHoverActions = jest.fn().mockImplementation((lock: boolean) => {
      hasLockedHoverActions$.next(lock);
    });
    const api = {
      ...makeApi([{ esql: 'FROM logs' }]),
      lockHoverActions,
      hasLockedHoverActions$,
    };
    await openPopover(api);
    await userEvent.click(screen.getByTestId(`embeddablePanelEsqlNotification-${api.uuid}`));
    expect(lockHoverActions).toHaveBeenCalledWith(false);
  });
});
