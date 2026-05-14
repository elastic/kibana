/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, type ReactNode } from 'react';

import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { useOpenContentEditor } from '@kbn/content-management-content-editor';
import {
  createContentInsightsService,
  createDuplicateTitleValidator,
  createFavoritesService,
  createTagsService,
  createUserProfilesService,
  SavedObjectActivityRow,
  useRecentlyAccessedDecoration,
  withPerformanceMetrics,
  type ContentEditorConfig,
  type ContentListClientProviderProps,
  type TableListViewFindItemsFn,
} from '@kbn/content-list-provider-client';
import type { ContentListFeatures, ContentListItem } from '@kbn/content-list-provider';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { ViewMode } from '@kbn/presentation-publishing';
import { asyncMap } from '@kbn/std';

import { DASHBOARD_APP_ID } from '../../../common/page_bundle_constants';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { contentEditorFlyoutStrings } from '../../dashboard_app/_dashboard_app_strings';
import { dashboardClient, findService, hasLibraryItemWithTitle } from '../../dashboard_client';
import { getAccessControlClient } from '../../services/access_control_service';
import {
  coreServices,
  savedObjectsTaggingService,
  usageCollectionService,
} from '../../services/kibana_services';
import { logger } from '../../services/logger';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import {
  SAVED_OBJECT_DELETE_TIME,
  SAVED_OBJECT_LOADED_TIME,
} from '../../utils/telemetry_constants';
import {
  dashboardListingErrorStrings,
  dashboardListingTableStrings,
} from '../_dashboard_listing_strings';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { DashboardListingEmptyPrompt } from '../dashboard_listing_empty_prompt';
import type { DashboardSavedObjectUserContent } from '../types';
import { getDashboardBackupService } from '../../services/dashboard_api_services';
import { notifyUnsavedDashboardsChanged } from '../use_unsaved_dashboards';

/**
 * Per-item guard for the edit/delete row actions, shaped to match
 * `EditActionProps` / `DeleteActionProps` from `@kbn/content-list-table` so
 * a single object can be spread onto both.
 */
export interface DashboardItemActionGuard {
  enabled: (item: ContentListItem) => boolean;
  disabledReason: (item: ContentListItem) => string | undefined;
}

/**
 * Build the per-item edit/delete guard from the dashboard write-controls
 * capability and the per-row managed/access-control flags. Mirrors the
 * legacy `rowItemActions` logic from the `TableListViewTable` integration.
 */
const buildItemActionGuard = (showWriteControls: boolean): DashboardItemActionGuard => {
  const isDisabled = (item: ContentListItem) => {
    if (!showWriteControls) {
      return true;
    }
    const dashboardItem = item as unknown as DashboardSavedObjectUserContent;
    if (dashboardItem.managed === true) {
      return true;
    }
    if (
      dashboardItem.canManageAccessControl === false &&
      dashboardItem.accessMode === 'write_restricted'
    ) {
      return true;
    }
    return false;
  };

  return {
    enabled: (item) => !isDisabled(item),
    disabledReason: (item) => {
      if (!showWriteControls) {
        return contentEditorFlyoutStrings.readonlyReason.missingPrivileges;
      }
      const dashboardItem = item as unknown as DashboardSavedObjectUserContent;
      if (dashboardItem.managed) {
        return contentEditorFlyoutStrings.readonlyReason.managedEntity;
      }
      if (
        dashboardItem.canManageAccessControl === false &&
        dashboardItem.accessMode === 'write_restricted'
      ) {
        return contentEditorFlyoutStrings.readonlyReason.accessControl;
      }
      return undefined;
    },
  };
};

/**
 * Configuration accepted by {@link useDashboardListingTable}.
 */
export interface UseDashboardListingTableArgs {
  /** Stable identifier used by the underlying provider for query-key scoping. */
  id?: string;
  /** Whether to disable (but still render) the header create button. */
  disableCreateDashboardButton?: boolean;
  /** Returns the URL for a given dashboard, used by `Column.Name`'s link. */
  getDashboardUrl: (dashboardId: string, usesTimeRestore: boolean) => string;
  /** Navigates to a dashboard, optionally in a specific view mode. */
  goToDashboard: (dashboardId?: string, viewMode?: ViewMode) => void;
  /** When `true`, the header create button is omitted entirely. */
  showCreateDashboardButton?: boolean;
  /** When `true`, the empty-state offers to resume an unsaved in-progress dashboard. */
  useSessionStorageIntegration?: boolean;
  /** Initial search text to pre-populate the toolbar search box with. */
  initialFilter?: string;
  /**
   * Forwarded to `features.urlSync` on the underlying provider when defined.
   * Leave `undefined` to inherit the provider's router-context default.
   */
  urlStateEnabled?: boolean;
}

/**
 * Distributive `Omit` that walks a union and removes the key from each
 * member individually. Plain `Omit` collapses
 * `{ id: string; queryKeyScope?: string } | { id?: string; queryKeyScope: string }`
 * into a single intersection where both keys are widened to optional, which
 * loses the "at least one of" constraint required by `ContentListIdentity`.
 */
type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

/**
 * Bundle returned by {@link useDashboardListingTable}.
 *
 * `providerProps` carries the full `ContentListClientProvider` config —
 * spread it directly onto the provider and let `<DashboardListingContent>`
 * render the toolbar/table/footer composition.
 */
export interface DashboardListingTableBundle {
  /** Props consumed by `<ContentListClientProvider>` (sans `children`). */
  providerProps: DistributiveOmit<ContentListClientProviderProps, 'children'>;
  /** Header "Create dashboard" handler. `undefined` when the user can't create. */
  createItem?: () => void;
  /** Empty-state node passed to `<ContentList>`. */
  emptyPrompt: ReactNode;
  /** Per-item guard, spread onto `<Action.Edit>` / `<Action.Delete>`. */
  itemActionGuard: DashboardItemActionGuard;
  /**
   * Pre-rendered toolbar filter slot — closure-bound to the
   * recently-accessed history for `<RecentsFilter />`. Mount inside
   * `<Filters>` next to `<Filters.Starred />`.
   */
  toolbarFilters: ReactNode;
}

/**
 * Build the bundle of props consumed by `ContentListClientProvider` and
 * `<DashboardListingContent>` for the dashboard listing.
 *
 * Encapsulates: data fetching (with EBT performance metrics), delete/edit
 * handlers (also instrumented), content-editor save and validation,
 * capability gates, the empty prompt, and recently-accessed integration.
 * Both the page (`DashboardListing`) and the embeddable
 * (`DashboardListingTable`) consume the same bundle.
 *
 * The repetitive saved-object listing wiring (favorites, tags, user
 * profiles, content-insights, duplicate-title validation, perf metrics,
 * recents) lives in `@kbn/content-list-provider-client/services/*` —
 * everything left here is dashboards-specific business logic.
 */
export const useDashboardListingTable = ({
  id = 'dashboard-listing',
  disableCreateDashboardButton,
  getDashboardUrl,
  goToDashboard,
  showCreateDashboardButton = true,
  useSessionStorageIntegration,
  initialFilter,
  urlStateEnabled,
}: UseDashboardListingTableArgs): DashboardListingTableBundle => {
  const { getEntityName, getEntityNamePlural } = dashboardListingTableStrings;
  const entityName = getEntityName();
  const entityNamePlural = getEntityNamePlural();

  const accessControlClient = getAccessControlClient();

  const { showWriteControls } = getDashboardCapabilities();
  const canSave = !!showWriteControls;
  const canDelete = canSave;

  const createItem = useCallback(() => {
    if (useSessionStorageIntegration && getDashboardBackupService().dashboardHasUnsavedEdits()) {
      confirmCreateWithUnsaved(() => {
        getDashboardBackupService().clearState();
        notifyUnsavedDashboardsChanged();
        goToDashboard();
      }, goToDashboard);
      return;
    }
    goToDashboard();
  }, [goToDashboard, useSessionStorageIntegration]);

  const recentlyAccessedService = useMemo(() => getDashboardRecentlyAccessedService(), []);
  const hasRecentlyAccessed = recentlyAccessedService.get().length > 0;
  const recents = useRecentlyAccessedDecoration(recentlyAccessedService);

  // Search the dashboard SO type and shape each hit into a
  // `DashboardSavedObjectUserContent`. `withPerformanceMetrics` adds the
  // `SAVED_OBJECT_LOADED_TIME` EBT event around the call, and
  // `recents.decorate` adds the `recent`/`accessedAt` fields used by the
  // `is:recent` filter and "Recently viewed" sort field.
  const findItems = useCallback<TableListViewFindItemsFn>(
    async (searchTerm, options) => {
      const search = withPerformanceMetrics(
        async () => {
          const [userResponse, globalPrivilegeResponse] = await Promise.allSettled([
            coreServices.userProfile.getCurrent(),
            accessControlClient.checkGlobalPrivilege(DASHBOARD_SAVED_OBJECT_TYPE),
          ]);

          const userId = userResponse.status === 'fulfilled' ? userResponse.value.uid : undefined;
          const isGloballyAuthorized =
            globalPrivilegeResponse.status === 'fulfilled'
              ? globalPrivilegeResponse.value.isGloballyAuthorized
              : false;

          const { total, dashboards } = await findService.search({
            query: searchTerm,
            per_page: options?.listingLimit,
            tags: (options?.references ?? []).map(({ id: tagId }) => tagId),
            excluded_tags: (options?.referencesToExclude ?? []).map(({ id: tagId }) => tagId),
          });

          const tagApi = savedObjectsTaggingService?.getTaggingApi();

          const hits = dashboards.map(({ id: dashboardId, data, meta }) => {
            const canManageAccessControl =
              isGloballyAuthorized ||
              accessControlClient.checkUserAccessControl({
                accessControl: {
                  owner: meta.owner,
                  accessMode: data?.access_control?.access_mode,
                },
                createdBy: meta.created_by,
                userId,
              });

            return {
              type: 'dashboard',
              id: dashboardId,
              updatedAt: meta.updated_at ?? '',
              createdAt: meta.created_at,
              createdBy: meta.created_by,
              updatedBy: meta.updated_by,
              references: tagApi && data.tags ? data.tags.map(tagApi.ui.tagIdToReference) : [],
              managed: meta.managed,
              attributes: {
                title: data.title,
                description: data.description,
                timeRestore: Boolean(data.time_range),
              },
              canManageAccessControl,
              accessMode: data?.access_control?.access_mode,
            } satisfies Omit<DashboardSavedObjectUserContent, 'recent' | 'accessedAt'>;
          });

          return { total, hits };
        },
        {
          analytics: coreServices.analytics,
          eventName: SAVED_OBJECT_LOADED_TIME,
          savedObjectType: DASHBOARD_SAVED_OBJECT_TYPE,
        }
      );

      return recents.decorate(await search());
    },
    [accessControlClient, recents]
  );

  const handleDelete = useCallback(async (items: ContentListItem[]) => {
    try {
      const del = withPerformanceMetrics(
        async (toDelete: ContentListItem[]) => {
          await asyncMap(toDelete, async ({ id: dashboardId }) => {
            await dashboardClient.delete(dashboardId);
            getDashboardBackupService().clearState(dashboardId);
          });
        },
        {
          analytics: coreServices.analytics,
          eventName: SAVED_OBJECT_DELETE_TIME,
          savedObjectType: DASHBOARD_SAVED_OBJECT_TYPE,
          meta: ([toDelete]) => ({ total: (toDelete as ContentListItem[]).length }),
        }
      );
      await del(items);
    } catch (error) {
      coreServices.notifications.toasts.addError(error, {
        title: dashboardListingErrorStrings.getErrorDeletingDashboardToast(),
      });
    }

    notifyUnsavedDashboardsChanged();
  }, []);

  const handleEdit = useCallback(
    ({ id: dashboardId }: ContentListItem) => goToDashboard(dashboardId, 'edit'),
    [goToDashboard]
  );

  // `timeRestore` is spread onto the top level of `ContentListItem` by the
  // strategy's `transformItem` (consumer-specific attribute keys are flattened),
  // so we narrow via the `ContentListItem<T>` generic at the destructure site —
  // `item.attributes.timeRestore` does not exist on the runtime shape.
  const getHref = useCallback(
    (item: ContentListItem) => {
      const { id: dashboardId, timeRestore } = item as ContentListItem<{ timeRestore: boolean }>;
      return getDashboardUrl(dashboardId, timeRestore);
    },
    [getDashboardUrl]
  );

  const item = useMemo(
    () => ({
      getHref,
      ...(canSave && { onEdit: handleEdit }),
      ...(canDelete && { onDelete: handleDelete }),
    }),
    [canDelete, canSave, getHref, handleDelete, handleEdit]
  );

  const updateItemMeta = useCallback(
    async ({
      id: dashboardId,
      ...updatedState
    }: Parameters<Required<OpenContentEditorParams>['onSave']>[0]) => {
      const dashboard = await findService.findById(dashboardId);
      if (dashboard.status === 'error') {
        return;
      }
      // `access_control` cannot be specified as part of the update payload.
      const { access_control: _ignored, ...restOfAttributes } = dashboard.attributes;
      await dashboardClient.update(dashboardId, { ...restOfAttributes, ...updatedState });
      notifyUnsavedDashboardsChanged();
    },
    []
  );

  const contentEditorValidators: OpenContentEditorParams['customValidators'] = useMemo(
    () => ({
      title: [
        createDuplicateTitleValidator({
          findCurrentTitle: async (dashboardId) => {
            const dashboard = await findService.findById(dashboardId);
            return dashboard.status === 'error' ? undefined : dashboard.attributes.title;
          },
          checkForDuplicate: async ({ title, lastSavedTitle }) => {
            // Case-insensitive equality with the last saved title means the user
            // didn't change anything meaningful — bypass the library lookup.
            if (title.toLowerCase() === lastSavedTitle.toLowerCase()) {
              return true;
            }
            return !(await hasLibraryItemWithTitle(title));
          },
          getDuplicateTitleWarning: (value) =>
            dashboardListingErrorStrings.getDuplicateTitleWarning(value),
        }),
      ],
    }),
    []
  );

  const emptyPrompt = useMemo(
    () => (
      <DashboardListingEmptyPrompt
        {...{
          createItem,
          disableCreateDashboardButton,
          goToDashboard,
          useSessionStorageIntegration,
        }}
      />
    ),
    [createItem, disableCreateDashboardButton, goToDashboard, useSessionStorageIntegration]
  );

  // Same guard whether or not write controls are enabled — when off,
  // `enabled()` returns `false` for every item.
  const itemActionGuard = useMemo(() => buildItemActionGuard(canSave), [canSave]);

  const services = useMemo<ContentListClientProviderProps['services']>(
    () => ({
      favorites: createFavoritesService({
        appId: DASHBOARD_APP_ID,
        savedObjectType: DASHBOARD_SAVED_OBJECT_TYPE,
        http: coreServices.http,
        userProfile: coreServices.userProfile,
        usageCollection: usageCollectionService,
      }),
      tags: createTagsService(savedObjectsTaggingService?.getTaggingApi()?.ui),
      userProfiles: createUserProfilesService(coreServices.userProfile),
      uiSettings: coreServices.uiSettings,
    }),
    []
  );

  const features = useMemo<ContentListFeatures>(
    () => ({
      sorting: {
        initialSort: hasRecentlyAccessed
          ? { field: 'accessedAt', direction: 'desc' }
          : { field: 'updatedAt', direction: 'desc' },
        fields: [
          { field: 'title', name: 'Name' },
          { field: 'updatedAt', name: 'Last updated' },
          ...(hasRecentlyAccessed
            ? [
                {
                  field: 'accessedAt',
                  name: 'Recently viewed',
                  ascLabel: 'Least recently viewed',
                  descLabel: 'Recently viewed',
                },
              ]
            : []),
        ],
      },
      pagination: true,
      selection: canDelete,
      starred: true,
      tags: true,
      userProfiles: true,
      // `is:recent` parsing comes from the `useRecentlyAccessedDecoration`
      // helper (see `recents.flag`). Combined with the `recent` decoration
      // on each hit, the strategy's generic flag matcher narrows the table
      // to recently viewed dashboards. Powers `<RecentsFilter />`.
      flags: [recents.flag],
      ...(initialFilter ? { search: { initialSearch: initialFilter } } : {}),
      // Setting `urlSync` to `undefined` would override the provider's
      // router-context default (which resolves to `true`); only include the
      // key when the caller explicitly passed `urlStateEnabled`.
      ...(urlStateEnabled !== undefined ? { urlSync: urlStateEnabled } : {}),
    }),
    [canDelete, hasRecentlyAccessed, initialFilter, recents, urlStateEnabled]
  );

  const openContentEditor = useOpenContentEditor();

  const contentInsightsService = useMemo(
    () =>
      createContentInsightsService({
        http: coreServices.http,
        logger,
        domainId: 'dashboard',
      }),
    []
  );

  const appendRows = useCallback(
    (listItem: ContentListItem) => (
      <SavedObjectActivityRow
        service={contentInsightsService}
        item={listItem as unknown as UserContentCommonSchema}
        entityNamePlural={entityNamePlural}
      />
    ),
    [contentInsightsService, entityNamePlural]
  );

  const contentEditor = useMemo<ContentEditorConfig>(
    () => ({
      openContentEditor,
      onSave: updateItemMeta,
      customValidators: contentEditorValidators,
      isReadonly: !canSave,
      appendRows,
    }),
    [appendRows, canSave, contentEditorValidators, openContentEditor, updateItemMeta]
  );

  const providerProps = useMemo<DistributiveOmit<ContentListClientProviderProps, 'children'>>(
    () => ({
      id,
      labels: { entity: entityName, entityPlural: entityNamePlural },
      isReadOnly: !canSave,
      services,
      features,
      findItems,
      item,
      contentEditor,
    }),
    [canSave, contentEditor, entityName, entityNamePlural, features, findItems, id, item, services]
  );

  return {
    providerProps,
    createItem: canSave && showCreateDashboardButton ? createItem : undefined,
    emptyPrompt,
    itemActionGuard,
    toolbarFilters: <recents.RecentsFilter />,
  };
};
