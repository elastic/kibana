/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { screen, render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock, notificationServiceMock } from '@kbn/core/public/mocks';
import type { Column } from '@kbn/data-source';
import { EsqlSource } from '@kbn/data-source';
import { HelpPopover } from './help_popover';
import { getEditorExtensions } from '@kbn/esql-utils';

jest.mock('@kbn/data-source', () => ({
  ...jest.requireActual('@kbn/data-source'),
  EsqlSource: { create: jest.fn() },
}));

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getEditorExtensions: jest
    .fn()
    .mockResolvedValue({ recommendedQueries: [], recommendedFields: [] }),
}));

jest.mock('@kbn/language-documentation', () => ({
  LanguageDocumentationFlyout: ({ isHelpMenuOpen }: { isHelpMenuOpen: boolean }) =>
    isHelpMenuOpen ? <div data-test-subj="esqlInlineDocumentationFlyout" /> : null,
}));

const mockToggleLanguageComponent = jest.fn();
const mockEditorActions = {
  currentQuery: 'FROM logstash-*',
  submitEsqlQuery: jest.fn(),
  editorIsInline: false,
  toggleLanguageComponent: mockToggleLanguageComponent,
};

jest.mock('../editor_actions_context', () => ({
  useEsqlEditorActions: () => mockEditorActions,
}));

const startMock = coreMock.createStart();
const notificationsMock = notificationServiceMock.createStartContract();

startMock.chrome.getActiveSolutionNavId$.mockReturnValue(new BehaviorSubject('oblt'));
startMock.http.get = jest.fn().mockResolvedValue({ recommendedQueries: [] });
startMock.notifications = notificationsMock;

const services = {
  core: startMock,
  data: {
    dataViews: {},
  },
};

const makeSource = (columns: Column[], timeFieldName?: string) =>
  ({ title: 'logstash-*', timeFieldName, getColumns: () => columns } as unknown as EsqlSource);

const logstashSource = makeSource(
  [
    { name: '@timestamp', type: 'date', esType: 'date', source: 'index' },
    { name: 'bytes', type: 'number', esType: 'long', source: 'index' },
    { name: 'message', type: 'string', esType: 'text', source: 'index' },
  ] as Column[],
  '@timestamp'
);

describe('HelpPopover', () => {
  const renderHelpPopover = async (
    source?: EsqlSource,
    props: React.ComponentProps<typeof HelpPopover> = {}
  ) => {
    const create = EsqlSource.create as jest.Mock;
    if (source) {
      create.mockResolvedValue(source);
    } else {
      create.mockRejectedValue(new Error('no source'));
    }
    return await act(async () => {
      render(
        <KibanaContextProvider services={services as any}>
          <HelpPopover {...props} />
        </KibanaContextProvider>
      );
    });
  };

  beforeEach(() => {
    startMock.http.get.mockClear();
    (EsqlSource.create as jest.Mock).mockClear();
    (getEditorExtensions as jest.Mock).mockClear();
    notificationsMock.feedback.isEnabled.mockReturnValue(true);
    mockEditorActions.editorIsInline = false;
    mockToggleLanguageComponent.mockClear();
  });

  it('should render a button', async () => {
    await renderHelpPopover();
    expect(screen.getByTestId('esql-help-popover-button')).toBeInTheDocument();
  });

  it('should open a menu when the popover is open', async () => {
    await renderHelpPopover();
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    expect(screen.getByTestId('esql-quick-reference')).toBeInTheDocument();
    expect(screen.queryByTestId('esql-recommended-queries')).not.toBeInTheDocument();
  });

  it('should have recommended queries if a dataview is available', async () => {
    await renderHelpPopover(logstashSource);
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
    });
  });

  it('hides recommended queries when hideRecommendedQueries is set, even with a dataview', async () => {
    await renderHelpPopover(logstashSource, { hideRecommendedQueries: true });
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    // The derivation is skipped, so the section never appears.
    expect(EsqlSource.create).not.toHaveBeenCalled();
    expect(screen.queryByTestId('esql-recommended-queries')).not.toBeInTheDocument();
    // The rest of the menu still renders.
    expect(screen.getByTestId('esql-quick-reference')).toBeInTheDocument();
  });

  it('should not have feedback if feedback is not enabled', async () => {
    notificationsMock.feedback.isEnabled.mockReturnValue(false);
    await renderHelpPopover(logstashSource);
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    expect(screen.queryByTestId('esql-feedback')).not.toBeInTheDocument();
  });

  it('should fetch ESQL extensions when activeSolutionId and queryForRecommendedQueries are present', async () => {
    const mockQueries = [
      { name: 'Count of logs', query: 'FROM logstash1 | STATS COUNT()' },
      { name: 'Average bytes', query: 'FROM logstash2 | STATS AVG(bytes) BY log.level' },
    ];

    (getEditorExtensions as jest.Mock).mockResolvedValueOnce({
      recommendedQueries: mockQueries,
      recommendedFields: [],
    });

    await renderHelpPopover(logstashSource);

    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => {
      expect(getEditorExtensions).toHaveBeenCalledTimes(1);
      expect(getEditorExtensions).toHaveBeenCalledWith(startMock.http, 'FROM logstash-*', 'oblt');
    });

    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
    await waitFor(() => userEvent.click(screen.getByTestId('esql-recommended-queries')));

    await waitFor(() => {
      expect(screen.getByText('Count of logs')).toBeInTheDocument();
      expect(screen.getByText('Average bytes')).toBeInTheDocument();
      expect(screen.getByText('Identify patterns')).toBeInTheDocument();
    });
  });

  it('should handle API call failure gracefully', async () => {
    (getEditorExtensions as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await renderHelpPopover(logstashSource);
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => {
      expect(getEditorExtensions).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
  });

  it('should open the documentation flyout when Help is clicked in standalone mode', async () => {
    await renderHelpPopover();
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => userEvent.click(screen.getByTestId('esql-quick-reference')));
    await waitFor(() => {
      expect(screen.getByTestId('esqlInlineDocumentationFlyout')).toBeInTheDocument();
    });
    expect(mockToggleLanguageComponent).not.toHaveBeenCalled();
  });

  it('should call toggleLanguageComponent from actions when Help is clicked in inline mode', async () => {
    mockEditorActions.editorIsInline = true;
    await renderHelpPopover();
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => userEvent.click(screen.getByTestId('esql-quick-reference')));
    expect(mockToggleLanguageComponent).toHaveBeenCalledTimes(1);
  });

  it('should not render the documentation flyout in inline mode', async () => {
    mockEditorActions.editorIsInline = true;
    await renderHelpPopover();
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    await waitFor(() => userEvent.click(screen.getByTestId('esql-quick-reference')));
    expect(screen.queryByTestId('esqlInlineDocumentationFlyout')).not.toBeInTheDocument();
  });

  it('should show identify patterns recommended query', async () => {
    const stubLogstashSource = makeSource(
      [
        { name: 'time', type: 'date', esType: 'date', source: 'index' },
        { name: 'message', type: 'string', esType: 'text', source: 'index' },
      ] as Column[],
      'time'
    );

    await renderHelpPopover(stubLogstashSource);
    await userEvent.click(screen.getByTestId('esql-help-popover-button'));
    expect(screen.queryByTestId('esql-recommended-queries')).toBeInTheDocument();
    await waitFor(() => userEvent.click(screen.getByTestId('esql-recommended-queries')));

    await waitFor(() => {
      expect(screen.getByText('Identify patterns')).toBeInTheDocument();
    });
  });
});
