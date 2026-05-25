/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import type { CoreStart } from '@kbn/core/public';
import type { ISessionService } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { QueryInputServices } from '@kbn/visualization-ui-components';
import type {
  EventAnnotationGroupConfig,
  EventAnnotationGroupContent,
} from '@kbn/event-annotation-common';
import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-components';
import {
  EventAnnotationListingPage,
  type EventAnnotationListingPageServices,
} from './annotation_listing_page';

// Replace the live `GroupEditorFlyout` with a sentinel that exposes the
// passed-in handlers as buttons, so test cases can drive its update/save
// path without rendering the real flyout (which pulls in Lens internals).
// `useGroupEditor` imports the flyout via its inner sibling path, so the
// mock must target that path rather than the package barrel.
jest.mock('./group_editor_flyout/group_editor_flyout', () => ({
  GroupEditorFlyout: jest.fn(({ group, updateGroup, onSave, onClose, searchSessionId }: any) => (
    <div data-test-subj="mock-group-editor-flyout">
      <span data-test-subj="mock-group-editor-flyout-title">{group?.title}</span>
      <span data-test-subj="mock-group-editor-flyout-session">{searchSessionId}</span>
      <button
        data-test-subj="mock-group-editor-flyout-update"
        onClick={() => updateGroup({ ...group, tags: ['my-new-tag'] })}
      >
        update
      </button>
      <button data-test-subj="mock-group-editor-flyout-save" onClick={() => onSave()}>
        save
      </button>
      <button data-test-subj="mock-group-editor-flyout-close" onClick={() => onClose()}>
        close
      </button>
    </div>
  )),
}));

const buildContent = (
  id: string,
  title: string,
  indexPatternId: string = 'some-id'
): EventAnnotationGroupContent => ({
  id,
  type: EVENT_ANNOTATION_GROUP_TYPE,
  updatedAt: '2024-01-15T10:30:00.000Z',
  references: [],
  attributes: {
    title,
    description: '',
    indexPatternId,
  },
});

const renderPage = (
  overrides: {
    mockEventAnnotationService?: Partial<EventAnnotationServiceType>;
    visualizeCapabilities?: Record<string, boolean>;
    items?: EventAnnotationGroupContent[];
    dataViews?: DataView[];
  } = {}
) => {
  const items = overrides.items ?? [buildContent('item-1', 'Group A')];

  const mockEventAnnotationService: EventAnnotationServiceType = {
    findAnnotationGroupContent: jest.fn().mockResolvedValue({ total: items.length, hits: items }),
    deleteAnnotationGroups: jest.fn().mockResolvedValue(undefined),
    loadAnnotationGroup: jest.fn().mockResolvedValue({
      annotations: [],
      description: '',
      tags: [],
      indexPatternId: 'some-id',
      title: 'Group A',
      ignoreGlobalFilters: false,
    } as EventAnnotationGroupConfig),
    updateAnnotationGroup: jest.fn().mockResolvedValue(undefined),
    createAnnotationGroup: jest.fn().mockResolvedValue(undefined),
    ...(overrides.mockEventAnnotationService ?? {}),
  } as EventAnnotationServiceType;

  // `ContentListClientProvider` reads `savedObjects:listingLimit` and
  // `savedObjects:perPage` from `core.uiSettings` at mount, then forwards
  // `listingLimit` to the consumer's `findItems`.
  const core = coreMock.createStart() as unknown as CoreStart;
  (core.uiSettings.get as jest.Mock).mockImplementation((key: string) => {
    if (key === 'savedObjects:listingLimit') {
      return 30;
    }
    if (key === 'savedObjects:perPage') {
      return 10;
    }
    return undefined;
  });
  // `EventAnnotationListingPage` derives capabilities from `core.application`;
  // the default `coreMock` has an empty `capabilities` bag, so inject.
  (core.application.capabilities as unknown as Record<string, unknown>).visualize_v2 =
    overrides.visualizeCapabilities ?? { delete: true, save: true };

  const searchSessionStartMethod = jest.fn<string, []>(() => 'some-session-id');

  // `useNavigateToLens` only invokes `embeddable.getStateTransfer()` when the
  // empty-state CTA is clicked, which none of these tests reach. An empty
  // stub is enough to satisfy the constructor.
  const mockEmbeddable = {} as EmbeddableStart;

  const services: EventAnnotationListingPageServices = {
    core,
    savedObjectsTagging: taggingApiMock.create(),
    eventAnnotationService: mockEventAnnotationService,
    dataViews: overrides.dataViews ?? [
      {
        id: 'some-id',
        title: 'Some data view',
      } as DataView,
    ],
    createDataView: () => Promise.resolve({} as DataView),
    queryInputServices: {} as QueryInputServices,
    LensEmbeddableComponent: () => <div />,
    sessionService: {
      start: searchSessionStartMethod,
      clear: jest.fn(),
    } as Partial<ISessionService> as ISessionService,
    embeddable: mockEmbeddable,
  };

  const utils = render(
    <I18nProvider>
      <EventAnnotationListingPage
        services={services}
        parentProps={{
          onFetchSuccess: () => {},
          setPageDataTestSubject: () => {},
        }}
      />
    </I18nProvider>
  );

  return {
    ...utils,
    mockEventAnnotationService,
    searchSessionStartMethod,
  };
};

describe('annotation list view', () => {
  it('searches for groups with the listing limit', async () => {
    const { mockEventAnnotationService } = renderPage();

    await waitFor(() => {
      expect(mockEventAnnotationService.findAnnotationGroupContent).toHaveBeenCalledWith(
        '',
        30,
        undefined,
        undefined
      );
    });
  });

  describe('editing groups', () => {
    it('opens the group editor with the loaded group when the edit action is invoked', async () => {
      const user = userEvent.setup();
      const { mockEventAnnotationService } = renderPage();

      await waitFor(() => {
        expect(screen.getByText('Group A')).toBeInTheDocument();
      });

      const editButton = await screen.findByTestId('content-list-table-action-edit');
      await user.click(editButton);

      await waitFor(() => {
        expect(mockEventAnnotationService.loadAnnotationGroup).toHaveBeenCalledWith('item-1');
      });

      expect(await screen.findByTestId('mock-group-editor-flyout')).toBeInTheDocument();
      expect(screen.getByTestId('mock-group-editor-flyout-session')).toHaveTextContent(
        'some-session-id'
      );
    });

    it('updates and saves the edited group', async () => {
      const user = userEvent.setup();
      const { mockEventAnnotationService } = renderPage();

      await waitFor(() => expect(screen.getByText('Group A')).toBeInTheDocument());

      await user.click(await screen.findByTestId('content-list-table-action-edit'));
      await screen.findByTestId('mock-group-editor-flyout');

      await user.click(screen.getByTestId('mock-group-editor-flyout-update'));
      await user.click(screen.getByTestId('mock-group-editor-flyout-save'));

      await waitFor(() => {
        expect(mockEventAnnotationService.updateAnnotationGroup).toHaveBeenCalledWith(
          expect.objectContaining({ tags: ['my-new-tag'] }),
          'item-1'
        );
      });
    });

    it('does not expose the edit action when the user lacks save permission', async () => {
      renderPage({ visualizeCapabilities: { save: false, delete: true } });

      await waitFor(() => expect(screen.getByText('Group A')).toBeInTheDocument());

      expect(screen.queryByTestId('content-list-table-action-edit')).not.toBeInTheDocument();
    });

    it('renders fully read-only when the user lacks both save and delete', async () => {
      renderPage({ visualizeCapabilities: { save: false, delete: false } });

      await waitFor(() => expect(screen.getByText('Group A')).toBeInTheDocument());

      // No edit action and no selection checkboxes — the listing is purely
      // viewable. `isReadOnly` is the combined gate that flips both off.
      expect(screen.queryByTestId('content-list-table-action-edit')).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: /select all rows/i })).not.toBeInTheDocument();
    });
  });

  describe('deleting groups', () => {
    it('does not expose selection bar (bulk delete) when the user lacks delete permission', async () => {
      renderPage({ visualizeCapabilities: { save: true, delete: false } });

      await waitFor(() => expect(screen.getByText('Group A')).toBeInTheDocument());

      // EUI's selection checkbox is only rendered when selection is enabled.
      expect(screen.queryByRole('checkbox', { name: /select all rows/i })).not.toBeInTheDocument();
    });

    it('selects all and bulk-deletes via the toolbar selection bar', async () => {
      const user = userEvent.setup();
      const { mockEventAnnotationService } = renderPage({
        items: [buildContent('item-1', 'Group A'), buildContent('item-2', 'Group B')],
      });

      await waitFor(() => expect(screen.getByText('Group A')).toBeInTheDocument());

      // `ContentListToolbar` only mounts the selection bar after the
      // header `select all rows` checkbox is checked.
      await user.click(await screen.findByRole('checkbox', { name: /select all rows/i }));
      await user.click(await screen.findByTestId('contentListToolbar-selectionBar-deleteButton'));
      await user.click(await screen.findByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(mockEventAnnotationService.deleteAnnotationGroups).toHaveBeenCalledWith([
          'item-1',
          'item-2',
        ]);
      });
    });
  });

  describe('data view filter', () => {
    it('filters groups by data view and keeps counts available after selection', async () => {
      const user = userEvent.setup();
      renderPage({
        items: [
          buildContent('item-1', 'Logs annotations', 'logs-id'),
          buildContent('item-2', 'Metrics annotations', 'metrics-id'),
        ],
        dataViews: [
          { id: 'logs-id', title: 'Logs' } as DataView,
          { id: 'metrics-id', title: 'Metrics' } as DataView,
        ],
      });

      await waitFor(() => expect(screen.getByText('Logs annotations')).toBeInTheDocument());

      await user.click(screen.getByTestId('contentListDataViewFilter'));

      await waitFor(() => {
        expect(
          screen.getByTestId('dataView-searchbar-option-logs-id').closest('li')
        ).toHaveTextContent(/Logs\s*1/);
      });
      expect(
        screen.getByTestId('dataView-searchbar-option-metrics-id').closest('li')
      ).toHaveTextContent(/Metrics\s*1/);

      await user.click(screen.getByTestId('dataView-searchbar-option-logs-id'));

      await waitFor(() => {
        expect(screen.queryByText('Metrics annotations')).not.toBeInTheDocument();
      });
      const queryText = (screen.getByTestId('contentListToolbar-searchBox') as HTMLInputElement)
        .value;
      expect(queryText).toContain('Logs');
      expect(queryText).not.toContain('logs-id');
      expect(screen.getByText('Logs annotations')).toBeInTheDocument();
      expect(
        screen.getByTestId('dataView-searchbar-option-logs-id').closest('li')
      ).toHaveTextContent(/Logs\s*1/);
      expect(
        screen.getByTestId('dataView-searchbar-option-metrics-id').closest('li')
      ).toHaveTextContent(/Metrics\s*1/);
    });

    it('buckets deleted data views under the unmatched option', async () => {
      const user = userEvent.setup();
      renderPage({
        items: [
          buildContent('item-1', 'Logs annotations', 'logs-id'),
          buildContent('item-2', 'Deleted annotations', 'deleted-id'),
        ],
        dataViews: [{ id: 'logs-id', title: 'Logs' } as DataView],
      });

      await waitFor(() => expect(screen.getByText('Deleted annotations')).toBeInTheDocument());

      await user.click(screen.getByTestId('contentListDataViewFilter'));

      await waitFor(() => {
        expect(
          screen.getByTestId('dataView-searchbar-option-__no_data_view__').closest('li')
        ).toHaveTextContent(/No data view\s*1/);
      });

      await user.click(screen.getByTestId('dataView-searchbar-option-__no_data_view__'));

      await waitFor(() => {
        expect(screen.queryByText('Logs annotations')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Deleted annotations')).toBeInTheDocument();
    });
  });

  describe('search session', () => {
    it('refreshes the session id from the editor flyout', async () => {
      const user = userEvent.setup();
      const { searchSessionStartMethod } = renderPage();

      await waitFor(() => expect(screen.getByText('Group A')).toBeInTheDocument());

      await user.click(await screen.findByTestId('content-list-table-action-edit'));
      const flyout = await screen.findByTestId('mock-group-editor-flyout');
      expect(flyout).toBeInTheDocument();
      expect(screen.getByTestId('mock-group-editor-flyout-session')).toHaveTextContent(
        'some-session-id'
      );

      // Tickle the session reset path: the mock flyout calls `refreshSearchSession`
      // via the same prop wiring that the real one uses on save.
      searchSessionStartMethod.mockReturnValue('new-session-id');

      // Re-open by closing and re-clicking to take a new session reading once
      // the mocked flyout invokes the refresh; the component re-renders the
      // flyout body with the new searchSessionId.
      const { GroupEditorFlyout } = jest.requireMock(
        './group_editor_flyout/group_editor_flyout'
      ) as { GroupEditorFlyout: jest.Mock };
      const lastCallProps =
        GroupEditorFlyout.mock.calls[GroupEditorFlyout.mock.calls.length - 1][0];
      act(() => {
        lastCallProps.refreshSearchSession();
      });

      await waitFor(() => {
        const callProps = GroupEditorFlyout.mock.calls[GroupEditorFlyout.mock.calls.length - 1][0];
        expect(callProps.searchSessionId).toBe('new-session-id');
      });
    });
  });
});
