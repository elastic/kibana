/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import useUnmount from 'react-use/lib/useUnmount';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import type { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { Reference } from '@kbn/content-management-utils';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { ViewMode } from '@kbn/presentation-publishing';
import {
  findListItems as findVisualizationListItems,
  toTableListViewSavedObject,
  showNewVisModal,
  getNoItemsMessage,
} from '@kbn/visualizations-plugin/public';
import type { EventAnnotationGroupContent } from '@kbn/event-annotation-common';

import { asyncMap } from '@kbn/std';
import { DASHBOARD_APP_ID } from '../../../common/page_bundle_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import {
  SAVED_OBJECT_DELETE_TIME,
  SAVED_OBJECT_LOADED_TIME,
} from '../../utils/telemetry_constants';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import {
  coreServices,
  contentManagementService,
  embeddableService,
  eventAnnotationService,
  savedObjectsTaggingService,
  visualizationsService,
} from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import {
  dashboardListingErrorStrings,
  dashboardListingTableStrings,
} from '../_dashboard_listing_strings';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { DashboardListingEmptyPrompt } from '../dashboard_listing_empty_prompt';
import type { DashboardSavedObjectUserContent } from '../types';
import {
  checkForDuplicateDashboardTitle,
  dashboardClient,
  findService,
} from '../../dashboard_client';

type GetDetailViewLink =
  TableListViewTableProps<DashboardSavedObjectUserContent>['getDetailViewLink'];

const SAVED_OBJECTS_LIMIT_SETTING = 'savedObjects:listingLimit';
const SAVED_OBJECTS_PER_PAGE_SETTING = 'savedObjects:perPage';

type DashboardListingViewTableProps = Omit<
  TableListViewTableProps<DashboardSavedObjectUserContent>,
  'tableCaption'
> & { title: string };

interface UseDashboardListingTableReturnType {
  hasInitialFetchReturned: boolean;
  pageDataTestSubject: string | undefined;
  refreshUnsavedDashboards: () => void;
  tableListViewTableProps: DashboardListingViewTableProps;
  unsavedDashboardIds: string[];
  contentInsightsClient: ContentInsightsClient;
}

export const useDashboardListingTable = ({
  dashboardListingId = 'dashboard',
  disableCreateDashboardButton,
  getDashboardUrl,
  goToDashboard,
  headingId = 'dashboardListingHeading',
  initialFilter,
  urlStateEnabled,
  useSessionStorageIntegration,
  showCreateDashboardButton = true,
  contentTypeFilter,
}: {
  dashboardListingId?: string;
  disableCreateDashboardButton?: boolean;
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  headingId?: string;
  initialFilter?: string;
  urlStateEnabled?: boolean;
  useSessionStorageIntegration?: boolean;
  showCreateDashboardButton?: boolean;
  contentTypeFilter?: 'dashboards' | 'visualizations' | 'annotation-groups';
}): UseDashboardListingTableReturnType => {
  const { getEntityName, getTableListTitle, getEntityNamePlural } = dashboardListingTableStrings;

  // Use appropriate entity names based on contentTypeFilter (each tab shows different content type)
  const baseEntityName = getEntityName();
  const baseEntityNamePlural = getEntityNamePlural();

  const title = getTableListTitle();
  const entityName = contentTypeFilter === 'visualizations' ? 'visualization' : baseEntityName;
  const entityNamePlural =
    contentTypeFilter === 'visualizations' ? 'visualizations' : baseEntityNamePlural;

  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);

  const dashboardBackupService = useMemo(() => getDashboardBackupService(), []);

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardBackupService.getDashboardIdsWithUnsavedChanges()
  );

  const listingLimit = coreServices.uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = coreServices.uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  // Store close function for new visualization modal (to close on navigation)
  const closeNewVisModal = useRef(() => {});
  const { pathname } = useLocation();

  const createItem = useCallback(
    (contentTypeTab?: 'dashboards' | 'visualizations' | 'annotation-groups') => {
      const contentType = contentTypeTab ?? contentTypeFilter;

      if (contentType === 'visualizations') {
        closeNewVisModal.current = showNewVisModal();
        return;
      }

      if (contentType === 'annotation-groups') {
        // For annotation groups, navigate to Lens
        coreServices.application.navigateToApp('lens', { path: '#/' });
        return;
      }

      // Default: create dashboard
      if (useSessionStorageIntegration && dashboardBackupService.dashboardHasUnsavedEdits()) {
        confirmCreateWithUnsaved(() => {
          dashboardBackupService.clearState();
          goToDashboard();
        }, goToDashboard);
        return;
      }
      goToDashboard();
    },
    [dashboardBackupService, goToDashboard, useSessionStorageIntegration, contentTypeFilter]
  );

  // Close new visualization modal when navigating away (e.g., browser back button)
  useEffect(() => {
    return () => {
      closeNewVisModal.current();
    };
  }, [pathname]);

  // Cleanup modal on unmount
  useUnmount(() => closeNewVisModal.current());

  const updateItemMeta = useCallback(
    async ({ id, ...updatedState }: Parameters<Required<OpenContentEditorParams>['onSave']>[0]) => {
      const dashboard = await findService.findById(id);
      if (dashboard.status === 'error') {
        return;
      }
      const { references, ...currentState } = dashboard.attributes;
      await dashboardClient.update(
        id,
        {
          ...currentState,
          ...updatedState,
        },
        dashboard.references
      );

      setUnsavedDashboardIds(dashboardBackupService.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackupService]
  );

  const contentEditorValidators: OpenContentEditorParams['customValidators'] = useMemo(
    () => ({
      title: [
        {
          type: 'warning',
          fn: async (value: string, id: string) => {
            if (id) {
              try {
                const dashboard = await findService.findById(id);
                if (dashboard.status === 'error') {
                  return;
                }

                const validTitle = await checkForDuplicateDashboardTitle({
                  title: value,
                  copyOnSave: false,
                  lastSavedTitle: dashboard.attributes.title,
                  isTitleDuplicateConfirmed: false,
                });

                if (!validTitle) {
                  throw new Error(dashboardListingErrorStrings.getDuplicateTitleWarning(value));
                }
              } catch (e) {
                return e.message;
              }
            }
          },
        },
      ],
    }),
    []
  );

  const emptyPrompt = useMemo(() => {
    if (contentTypeFilter === 'visualizations') {
      return getNoItemsMessage(createItem);
    }
    return (
      <DashboardListingEmptyPrompt
        createItem={createItem}
        disableCreateDashboardButton={disableCreateDashboardButton}
        goToDashboard={goToDashboard}
        setUnsavedDashboardIds={setUnsavedDashboardIds}
        unsavedDashboardIds={unsavedDashboardIds}
        useSessionStorageIntegration={useSessionStorageIntegration}
      />
    );
  }, [
    contentTypeFilter,
    createItem,
    disableCreateDashboardButton,
    goToDashboard,
    unsavedDashboardIds,
    useSessionStorageIntegration,
  ]);

  const findItems = useCallback(
    async (
      searchTerm: string,
      {
        references,
        referencesToExclude,
        tabId = 'dashboards',
      }: {
        references?: Reference[];
        referencesToExclude?: Reference[];
        tabId?: 'dashboards' | 'visualizations' | 'annotation-groups';
      } = {}
    ) => {
      const searchStartTime = window.performance.now();

      // Handle different content types
      if (tabId === 'visualizations') {
        const response = await findVisualizationListItems(
          visualizationsService,
          searchTerm,
          listingLimit,
          references,
          referencesToExclude
        );

        const searchEndTime = window.performance.now();
        const searchDuration = searchEndTime - searchStartTime;
        reportPerformanceMetricEvent(coreServices.analytics, {
          eventName: SAVED_OBJECT_LOADED_TIME,
          duration: searchDuration,
          meta: {
            saved_object_type: 'visualization',
          },
        });

        const transformedHits = response.hits.map((hit: Record<string, unknown>) => {
          const visItem = toTableListViewSavedObject(hit);

          // Map to our Dashboard listing type
          return {
            type: visItem.savedObjectType || visItem.type,
            id: visItem.id,
            updatedAt: visItem.updatedAt,
            createdAt: visItem.createdAt,
            createdBy: visItem.createdBy,
            updatedBy: visItem.updatedBy,
            references: visItem.references ?? [],
            managed: visItem.managed,
            editor: visItem.editor, // Store editor info for proper navigation (Maps, Lens, etc.)
            attributes: {
              title: visItem.attributes.title,
              description: visItem.attributes.description,
              timeRestore: false, // visualizations don't have timeRestore
              visType: visItem.typeTitle,
              readOnly: visItem.attributes.readOnly,
            },
          };
        });

        return {
          total: response.total,
          hits: transformedHits,
        };
      }

      if (tabId === 'annotation-groups') {
        if (!eventAnnotationService) {
          return { total: 0, hits: [] };
        }

        try {
          // Fetch annotation groups using the event annotation service
          const annotationService = await eventAnnotationService.getService();

          const response = await annotationService.findAnnotationGroupContent(
            searchTerm,
            listingLimit,
            references?.map((r) => r.id),
            referencesToExclude?.map((r) => r.id)
          );

          const searchEndTime = window.performance.now();
          const searchDuration = searchEndTime - searchStartTime;
          reportPerformanceMetricEvent(coreServices.analytics, {
            eventName: SAVED_OBJECT_LOADED_TIME,
            duration: searchDuration,
            meta: {
              saved_object_type: 'event-annotation-group',
            },
          });

          const mappedHits = response.hits.map((hit: EventAnnotationGroupContent) => {
            return {
              ...hit,
              type: 'event-annotation-group', // Explicitly set type for client-side filtering
              attributes: {
                title: hit.attributes.title,
                description: hit.attributes.description,
                timeRestore: false, // Annotation groups don't have timeRestore
                indexPatternId: hit.attributes.indexPatternId,
                dataViewSpec: hit.attributes.dataViewSpec,
              },
            };
          });

          return {
            total: response.total,
            hits: mappedHits,
          };
        } catch (error) {
          throw error;
        }
      }

      // Default: fetch dashboards
      return findService
        .search({
          search: searchTerm,
          per_page: listingLimit,
          tags: {
            included: (references ?? []).map(({ id }) => id),
            excluded: (referencesToExclude ?? []).map(({ id }) => id),
          },
        })
        .then(({ total, dashboards }) => {
          const searchEndTime = window.performance.now();
          const searchDuration = searchEndTime - searchStartTime;
          reportPerformanceMetricEvent(coreServices.analytics, {
            eventName: SAVED_OBJECT_LOADED_TIME,
            duration: searchDuration,
            meta: {
              saved_object_type: DASHBOARD_SAVED_OBJECT_TYPE,
            },
          });
          const tagApi = savedObjectsTaggingService?.getTaggingApi();
          const hits = dashboards.map(
            ({ id, data, meta }) =>
              ({
                type: 'dashboard',
                id,
                updatedAt: meta.updatedAt!,
                createdAt: meta.createdAt,
                createdBy: meta.createdBy,
                updatedBy: meta.updatedBy,
                references: tagApi && data.tags ? data.tags.map(tagApi.ui.tagIdToReference) : [],
                managed: meta.managed,
                attributes: {
                  title: data.title,
                  description: data.description,
                  timeRestore: Boolean(data.timeRange),
                },
              } as DashboardSavedObjectUserContent)
          );
          return {
            total,
            hits,
          };
        });
    },
    [listingLimit]
  );

  const deleteItems = useCallback(
    async (itemsToDelete: Array<{ id: string; type?: string }>) => {
      try {
        const deleteStartTime = window.performance.now();

        await asyncMap(itemsToDelete, async ({ id, type }) => {
          if (type === 'dashboard') {
            await dashboardClient.delete(id);
            dashboardBackupService.clearState(id);
          } else if (type) {
            await contentManagementService.client.delete({
              contentTypeId: type,
              id,
            });
          }
        });

        const deleteDuration = window.performance.now() - deleteStartTime;

        reportPerformanceMetricEvent(coreServices.analytics, {
          eventName: SAVED_OBJECT_DELETE_TIME,
          duration: deleteDuration,
          meta: {
            saved_object_type: itemsToDelete[0]?.type ?? 'unknown',
            total: itemsToDelete.length,
          },
        });
      } catch (error) {
        coreServices.notifications.toasts.addError(error, {
          title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
        });
      }

      setUnsavedDashboardIds(dashboardBackupService.getDashboardIdsWithUnsavedChanges());
    },
    [dashboardBackupService]
  );

  const editItem = useCallback(
    async ({
      id,
      type,
      editor,
    }: {
      id: string | undefined;
      type?: string;
      editor?: DashboardSavedObjectUserContent['editor'];
    }) => {
      if (type === 'dashboard') {
        goToDashboard(id, 'edit');
        return;
      }

      if (type === 'event-annotation-group') {
        // Annotation groups will be handled by the annotation groups tab component
        // from the Event Annotation Listing plugin
        return;
      }

      // Handle visualizations with custom editor (e.g., Maps with editor.editApp)
      if (editor) {
        // Custom onEdit handler (e.g., some embeddables)
        if ('onEdit' in editor && editor.onEdit) {
          await editor.onEdit(id!);
          return;
        }

        const { editApp, editUrl } = editor;

        // Custom app navigation (e.g., Maps)
        if (editApp) {
          coreServices.application.navigateToApp(editApp, { path: editUrl });
          return;
        }

        // Standard visualizations with editUrl
        if (editUrl) {
          const stateTransfer = embeddableService.getStateTransfer();
          stateTransfer.navigateToEditor('visualize', {
            path: `#${editUrl}`,
            state: { originatingApp: DASHBOARD_APP_ID },
          });
          return;
        }
      }

      // Fallback: edit through visualize app
      const stateTransfer = embeddableService.getStateTransfer();
      stateTransfer.navigateToEditor('visualize', {
        path: `#/edit/${id}`,
        state: { originatingApp: DASHBOARD_APP_ID },
      });
    },
    [goToDashboard]
  );

  const onFetchSuccess = useCallback(() => {
    if (!hasInitialFetchReturned) {
      setHasInitialFetchReturned(true);
    }
  }, [hasInitialFetchReturned]);

  const getDetailViewLink = useCallback<NonNullable<GetDetailViewLink>>(
    ({ id, attributes: { timeRestore, readOnly }, type }) => {
      // For maps, visualizations and annotation groups, don't provide a link - use onClick instead
      if (type === 'map' || type === 'visualization' || type === 'event-annotation-group') {
        return undefined;
      }

      // Default: dashboard URL
      return getDashboardUrl(id, timeRestore);
    },
    [getDashboardUrl]
  );

  const getOnClickTitle = useCallback((item: DashboardSavedObjectUserContent) => {
    const { id, type, attributes } = item;
    const isReadOnly = attributes.readOnly;

    // Handle maps with state transfer
    if (type === 'map') {
      return () => {
        const stateTransfer = embeddableService.getStateTransfer();
        stateTransfer.navigateToEditor('maps', {
          path: `/map/${id}`,
          state: {
            originatingApp: DASHBOARD_APP_ID,
          },
        });
      };
    }

    // Don't allow clicking on read-only visualizations
    if (type === 'visualization') {
      if (isReadOnly) {
        // Return undefined to prevent navigation
        return undefined;
      }

      // Handle visualizations with state transfer
      return () => {
        const stateTransfer = embeddableService.getStateTransfer();
        stateTransfer.navigateToEditor('visualize', {
          path: `#/edit/${id}`,
          state: {
            originatingApp: DASHBOARD_APP_ID,
          },
        });
      };
    }

    if (type === 'event-annotation-group') {
      // Annotation groups are view-only - don't allow clicking
      return undefined;
    }

    // Dashboards: let the link handle it (no onClick needed)
    return undefined;
  }, []);

  const rowItemActions = useCallback((item: DashboardSavedObjectUserContent) => {
    const { showWriteControls } = getDashboardCapabilities();
    const { managed, attributes } = item;
    const isReadOnly = attributes.readOnly;

    // Disable edit for managed items or read-only visualizations
    if (!showWriteControls || managed || isReadOnly) {
      return {
        edit: {
          enabled: false,
          reason: managed
            ? dashboardListingTableStrings.getManagementItemDisabledEditMessage()
            : isReadOnly
            ? dashboardListingTableStrings.getReadOnlyVisualizationMessage()
            : undefined,
        },
      };
    }

    return undefined;
  }, []);

  // Wrap findItems to inject contentTypeFilter
  const wrappedFindItems = useCallback(
    (
      searchTerm: string,
      options?: {
        references?: Reference[];
        referencesToExclude?: Reference[];
        tabId?: 'dashboards' | 'visualizations' | 'annotation-groups';
      }
    ) => {
      // Use contentTypeFilter as tabId when specified
      const effectiveTabId = contentTypeFilter || 'dashboards';
      return findItems(searchTerm, { ...options, tabId: effectiveTabId });
    },
    [findItems, contentTypeFilter]
  );

  const tableListViewTableProps: DashboardListingViewTableProps = useMemo(() => {
    const { showWriteControls } = getDashboardCapabilities();
    return {
      contentEditor: {
        isReadonly: !showWriteControls,
        onSave: updateItemMeta,
        customValidators: contentEditorValidators,
      },
      createItem: !showWriteControls || !showCreateDashboardButton ? undefined : createItem,
      deleteItems: !showWriteControls ? undefined : deleteItems,
      editItem: !showWriteControls ? undefined : editItem,
      emptyPrompt,
      entityName,
      entityNamePlural,
      findItems: wrappedFindItems,
      getDetailViewLink,
      getOnClickTitle,
      rowItemActions,
      headingId,
      id: dashboardListingId,
      initialFilter,
      initialPageSize,
      listingLimit,
      onFetchSuccess,
      setPageDataTestSubject,
      title,
      urlStateEnabled,
      createdByEnabled: true,
      recentlyAccessed: getDashboardRecentlyAccessedService(),
    };
  }, [
    contentEditorValidators,
    createItem,
    dashboardListingId,
    deleteItems,
    editItem,
    noItemsMessage,
    entityName,
    entityNamePlural,
    wrappedFindItems,
    getDetailViewLink,
    getOnClickTitle,
    headingId,
    initialFilter,
    initialPageSize,
    listingLimit,
    onFetchSuccess,
    rowItemActions,
    showCreateDashboardButton,
    title,
    updateItemMeta,
    urlStateEnabled,
  ]);

  const refreshUnsavedDashboards = useCallback(
    () => setUnsavedDashboardIds(getDashboardBackupService().getDashboardIdsWithUnsavedChanges()),
    []
  );

  const contentInsightsClient = useMemo(
    () => new ContentInsightsClient({ http: coreServices.http, logger }, { domainId: 'dashboard' }),
    []
  );

  return {
    hasInitialFetchReturned,
    pageDataTestSubject,
    refreshUnsavedDashboards,
    tableListViewTableProps,
    unsavedDashboardIds,
    contentInsightsClient,
  };
};
