/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { ContentInsightsClient } from '@kbn/content-management-content-insights-public';
import type { TableListViewTableProps } from '@kbn/content-management-table-list-view-table';
import type { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type { ViewMode } from '@kbn/presentation-publishing';

import { asyncMap } from '@kbn/std';
import type { DashboardSearchAPIResult } from '../../../server/content_management';
import { DASHBOARD_APP_ID } from '../../../common/constants';
import {
  DASHBOARD_CONTENT_ID,
  SAVED_OBJECT_DELETE_TIME,
  SAVED_OBJECT_LOADED_TIME,
} from '../../utils/telemetry_constants';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import {
  coreServices,
  contentManagementService,
  embeddableService,
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

// Map visualization type names to their icons
const getVisTypeIcon = (visType: string): string => {
  const iconMap: Record<string, string> = {
    area: 'visArea',
    line: 'visLine',
    bar: 'visBarVertical',
    horizontal_bar: 'visBarHorizontal',
    pie: 'visPie',
    markdown: 'visText',
    vega: 'visVega',
    metric: 'visMetric',
    table: 'visTable',
    tagcloud: 'visTagCloud',
    gauge: 'visGauge',
    goal: 'visGoal',
    heatmap: 'visHeatmap',
    timelion: 'visTimelion',
    Maps: 'gisApp',
  };
  return iconMap[visType] || 'visualizeApp';
};

const toTableListViewSavedObject = (
  hit: DashboardSearchAPIResult['hits'][number]
): DashboardSavedObjectUserContent => {
  const { title, description, timeRange } = hit.attributes;
  return {
    type: 'dashboard',
    id: hit.id,
    updatedAt: hit.updatedAt!,
    createdAt: hit.createdAt,
    createdBy: hit.createdBy,
    updatedBy: hit.updatedBy,
    references: hit.references ?? [],
    managed: hit.managed,
    attributes: {
      title,
      description,
      timeRestore: Boolean(timeRange),
    },
  };
};

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
  contentTypeTabsEnabled = true,
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
  contentTypeTabsEnabled?: boolean;
}): UseDashboardListingTableReturnType => {
  const { getEntityName, getTableListTitle, getEntityNamePlural } = dashboardListingTableStrings;
  const title = getTableListTitle();
  const entityName = getEntityName();
  const entityNamePlural = getEntityNamePlural();
  const [pageDataTestSubject, setPageDataTestSubject] = useState<string>();
  const [hasInitialFetchReturned, setHasInitialFetchReturned] = useState(false);

  const dashboardBackupService = useMemo(() => getDashboardBackupService(), []);

  const [unsavedDashboardIds, setUnsavedDashboardIds] = useState<string[]>(
    dashboardBackupService.getDashboardIdsWithUnsavedChanges()
  );

  const listingLimit = coreServices.uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = coreServices.uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const createItem = useCallback(() => {
    if (useSessionStorageIntegration && dashboardBackupService.dashboardHasUnsavedEdits()) {
      confirmCreateWithUnsaved(() => {
        dashboardBackupService.clearState();
        goToDashboard();
      }, goToDashboard);
      return;
    }
    goToDashboard();
  }, [dashboardBackupService, goToDashboard, useSessionStorageIntegration]);

  const updateItemMeta = useCallback(
    async ({ id, ...updatedState }: Parameters<Required<OpenContentEditorParams>['onSave']>[0]) => {
      const dashboard = await findService.findById(id);
      if (dashboard.status === 'error') {
        return;
      }
      const { references, spaces, namespaces, ...currentState } = dashboard.attributes;
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

  const emptyPrompt = useMemo(
    () => (
      <DashboardListingEmptyPrompt
        createItem={createItem}
        disableCreateDashboardButton={disableCreateDashboardButton}
        goToDashboard={goToDashboard}
        setUnsavedDashboardIds={setUnsavedDashboardIds}
        unsavedDashboardIds={unsavedDashboardIds}
        useSessionStorageIntegration={useSessionStorageIntegration}
      />
    ),
    [
      createItem,
      disableCreateDashboardButton,
      goToDashboard,
      unsavedDashboardIds,
      useSessionStorageIntegration,
    ]
  );

  const findItems = useCallback(
    async (
      searchTerm: string,
      {
        references,
        referencesToExclude,
        contentType = 'dashboards',
      }: {
        references?: SavedObjectsFindOptionsReference[];
        referencesToExclude?: SavedObjectsFindOptionsReference[];
        contentType?: 'dashboards' | 'visualizations' | 'annotation-groups';
      } = {}
    ) => {
      const searchStartTime = window.performance.now();

      // Handle different content types
      if (contentType === 'visualizations') {
        // Fetch visualizations using content management
        const response = (await contentManagementService.client.mSearch({
          contentTypes: [{ contentTypeId: 'visualization' }, { contentTypeId: 'map' }],
          query: {
            text: searchTerm ? `${searchTerm}*` : undefined,
            limit: listingLimit,
            tags: {
              included: references?.map((r) => r.id),
              excluded: referencesToExclude?.map((r) => r.id),
            },
          },
        })) as any;

        const searchEndTime = window.performance.now();
        const searchDuration = searchEndTime - searchStartTime;
        reportPerformanceMetricEvent(coreServices.analytics, {
          eventName: SAVED_OBJECT_LOADED_TIME,
          duration: searchDuration,
          meta: {
            saved_object_type: 'visualization',
          },
        });

        return {
          total: response.pagination.total,
          hits: response.hits.map((hit: any) => {
            // Extract visualization type from visState or use saved object type
            let visType: string | undefined;
            let readOnly = false;

            // For maps, use the saved object type
            if (hit.type === 'map') {
              visType = 'Maps';
            } else {
              // For visualizations, extract from visState
              try {
                if (hit.attributes.visState) {
                  const visState = JSON.parse(hit.attributes.visState);
                  visType = visState.type;
                } else if (hit.attributes.typeName) {
                  visType = hit.attributes.typeName;
                }
              } catch (e) {
                // If parsing fails, leave visType undefined
              }
            }

            // Mark deprecated visualization types as read-only
            // Markdown visualization is deprecated and has disableEdit: true
            if (visType === 'markdown') {
              readOnly = true;
            }

            return {
              type: hit.type === 'map' ? 'map' : 'visualization',
              id: hit.id,
              updatedAt: hit.updatedAt!,
              createdAt: hit.createdAt,
              createdBy: hit.createdBy,
              updatedBy: hit.updatedBy,
              references: hit.references ?? [],
              managed: hit.managed,
              attributes: {
                title: hit.attributes.title,
                description: hit.attributes.description,
                timeRestore: false, // visualizations don't have timeRestore
                visType,
                readOnly,
              },
            };
          }),
        };
      }

      if (contentType === 'annotation-groups') {
        // Fetch annotation groups using content management
        const response = (await contentManagementService.client.search({
          contentTypeId: 'event-annotation-group',
          query: {
            text: searchTerm ? `${searchTerm}*` : undefined,
            limit: listingLimit,
            tags: {
              included: references?.map((r) => r.id),
              excluded: referencesToExclude?.map((r) => r.id),
            },
          },
        })) as any;

        const searchEndTime = window.performance.now();
        const searchDuration = searchEndTime - searchStartTime;
        reportPerformanceMetricEvent(coreServices.analytics, {
          eventName: SAVED_OBJECT_LOADED_TIME,
          duration: searchDuration,
          meta: {
            saved_object_type: 'event-annotation-group',
          },
        });

        return {
          total: response.pagination.total,
          hits: response.hits.map((hit: any) => ({
            type: 'event-annotation-group',
            id: hit.id,
            updatedAt: hit.updatedAt!,
            createdAt: hit.createdAt,
            createdBy: hit.createdBy,
            updatedBy: hit.updatedBy,
            references: hit.references ?? [],
            managed: hit.managed,
            attributes: {
              title: hit.attributes.title,
              description: hit.attributes.description,
              timeRestore: false,
            },
          })),
        };
      }

      // Default: fetch dashboards
      return findService
        .search({
          search: searchTerm,
          size: listingLimit,
          hasReference: references,
          hasNoReference: referencesToExclude,
          options: {
            // include only tags references in the response to save bandwidth
            includeReferences: ['tag'],
            fields: ['title', 'description', 'timeRange'],
          },
        })
        .then(({ total, hits }) => {
          const searchEndTime = window.performance.now();
          const searchDuration = searchEndTime - searchStartTime;
          reportPerformanceMetricEvent(coreServices.analytics, {
            eventName: SAVED_OBJECT_LOADED_TIME,
            duration: searchDuration,
            meta: {
              saved_object_type: DASHBOARD_CONTENT_ID,
            },
          });
          return {
            total,
            hits: hits.map(toTableListViewSavedObject),
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
          if (type === 'map') {
            // Delete map using content management
            await contentManagementService.client.delete({
              contentTypeId: 'map',
              id,
            });
          } else if (type === 'visualization') {
            // Delete visualization using content management
            await contentManagementService.client.delete({
              contentTypeId: 'visualization',
              id,
            });
          } else if (type === 'event-annotation-group') {
            // Delete annotation group using content management
            await contentManagementService.client.delete({
              contentTypeId: 'event-annotation-group',
              id,
            });
          } else {
            // Delete dashboard
            await dashboardClient.delete(id);
            dashboardBackupService.clearState(id);
          }
        });

        const deleteDuration = window.performance.now() - deleteStartTime;
        reportPerformanceMetricEvent(coreServices.analytics, {
          eventName: SAVED_OBJECT_DELETE_TIME,
          duration: deleteDuration,
          meta: {
            saved_object_type: itemsToDelete[0]?.type || DASHBOARD_CONTENT_ID,
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
    ({ id, type }: { id: string | undefined; type?: string }) => {
      // Handle different content types
      if (type === 'map') {
        // Navigate to maps app
        const stateTransfer = embeddableService.getStateTransfer();
        stateTransfer.navigateToEditor('maps', {
          path: `/map/${id}`,
          state: {
            originatingApp: DASHBOARD_APP_ID,
          },
        });
        return;
      }

      if (type === 'visualization') {
        // Navigate to visualization edit page with state transfer
        const stateTransfer = embeddableService.getStateTransfer();
        stateTransfer.navigateToEditor('visualize', {
          path: `#/edit/${id}`,
          state: {
            originatingApp: DASHBOARD_APP_ID,
          },
        });
        return;
      }

      if (type === 'event-annotation-group') {
        // Annotation groups are view-only from dashboards
        // Users should create/edit them in Lens
        return;
      }

      // Default: edit dashboard
      goToDashboard(id, 'edit');
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

  const customTableColumn = useMemo<
    TableListViewTableProps<DashboardSavedObjectUserContent>['customTableColumn']
  >(
    () => ({
      field: 'attributes.visType',
      name: 'Type',
      sortable: true,
      width: '150px',
      render: (_visType: string | undefined, item: DashboardSavedObjectUserContent) => {
        // Only show type for visualizations and maps
        if ((item.type === 'visualization' || item.type === 'map') && item.attributes.visType) {
          const visType = item.attributes.visType;
          return (
            <span>
              <EuiIcon
                css={css`
                  margin-right: 8px;
                  vertical-align: middle;
                `}
                aria-hidden="true"
                type={getVisTypeIcon(visType)}
                size="m"
              />
              {visType}
            </span>
          );
        }
        return null;
      },
    }),
    []
  );

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
      findItems,
      getDetailViewLink,
      getOnClickTitle,
      customTableColumn,
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
      contentTypeTabsEnabled: true,
      recentlyAccessed: getDashboardRecentlyAccessedService(),
    };
  }, [
    contentEditorValidators,
    createItem,
    customTableColumn,
    dashboardListingId,
    deleteItems,
    editItem,
    emptyPrompt,
    entityName,
    entityNamePlural,
    findItems,
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
