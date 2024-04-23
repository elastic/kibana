/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './visualize_listing.scss';

import React, {
  useCallback,
  useRef,
  useMemo,
  useEffect,
  MouseEvent,
  MutableRefObject,
} from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useUnmount from 'react-use/lib/useUnmount';
import useMount from 'react-use/lib/useMount';

import { useLocation, useParams } from 'react-router-dom';

import type { SavedObjectReference } from '@kbn/core/public';
import { useKibana, useExecutionContext } from '@kbn/kibana-react-plugin/public';
import {
  TabbedTableListView,
  type TableListTab,
} from '@kbn/content-management-tabbed-table-list-view';
import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import { TableListViewProps } from '@kbn/content-management-table-list-view';
import { TableListViewTable } from '@kbn/content-management-table-list-view-table';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

import { findListItems } from '../../utils/saved_visualize_utils';
import { updateBasicSoAttributes } from '../../utils/saved_objects_utils/update_basic_attributes';
import { checkForDuplicateTitle } from '../../utils/saved_objects_utils/check_for_duplicate_title';
import { showNewVisModal } from '../../wizard';
import { getTypes } from '../../services';
import { SAVED_OBJECTS_LIMIT_SETTING, SAVED_OBJECTS_PER_PAGE_SETTING } from '../..';
import type { VisualizationListItem } from '../..';
import type { VisualizeServices } from '../types';
import { VisualizeConstants } from '../../../common/constants';
import { getNoItemsMessage, getCustomColumn } from '../utils';
import { getVisualizeListItemLink } from '../utils/get_visualize_list_item_link';
import type { VisualizationStage } from '../../vis_types/vis_type_alias_registry';

type VisualizeUserContent = VisualizationListItem &
  UserContentCommonSchema & {
    type: string;
    attributes: {
      id: string;
      title: string;
      description?: string;
      readOnly: boolean;
      error?: string;
    };
  };

const toTableListViewSavedObject = (savedObject: Record<string, unknown>): VisualizeUserContent => {
  return {
    id: savedObject.id as string,
    updatedAt: savedObject.updatedAt as string,
    managed: savedObject.managed as boolean,
    references: savedObject.references as Array<{ id: string; type: string; name: string }>,
    type: savedObject.savedObjectType as string,
    icon: savedObject.icon as string,
    stage: savedObject.stage as VisualizationStage,
    savedObjectType: savedObject.savedObjectType as string,
    typeTitle: savedObject.typeTitle as string,
    title: (savedObject.title as string) ?? '',
    error: (savedObject.error as string) ?? '',
    editor: savedObject.editor as any,
    attributes: {
      id: savedObject.id as string,
      title: (savedObject.title as string) ?? '',
      description: savedObject.description as string,
      readOnly: savedObject.readOnly as boolean,
      error: savedObject.error as string,
    },
  };
};
type CustomTableViewProps = Pick<
  TableListViewProps<VisualizeUserContent>,
  | 'createItem'
  | 'findItems'
  | 'deleteItems'
  | 'editItem'
  | 'contentEditor'
  | 'emptyPrompt'
  | 'rowItemActions'
>;

const useTableListViewProps = (
  closeNewVisModal: MutableRefObject<() => void>,
  listingLimit: number
): CustomTableViewProps => {
  const {
    services: {
      application,
      history,
      savedObjects,
      savedObjectsTagging,
      overlays,
      toastNotifications,
      visualizeCapabilities,
      contentManagement,
    },
  } = useKibana<VisualizeServices>();

  const visualizedUserContent = useRef<VisualizeUserContent[]>();

  const createNewVis = useCallback(() => {
    closeNewVisModal.current = showNewVisModal();
  }, [closeNewVisModal]);

  const editItem = useCallback(
    async ({ attributes: { id }, editor }: VisualizeUserContent) => {
      if (!('editApp' in editor || 'editUrl' in editor)) {
        await editor.onEdit(id);
        return;
      }

      const { editApp, editUrl } = editor;
      if (editApp) {
        application.navigateToApp(editApp, { path: editUrl });
        return;
      }
      // for visualizations the edit and view URLs are the same
      history.push(editUrl);
    },
    [application, history]
  );

  const noItemsFragment = useMemo(() => getNoItemsMessage(createNewVis), [createNewVis]);

  const fetchItems = useCallback(
    (
      searchTerm: string,
      {
        references,
        referencesToExclude,
      }: {
        references?: SavedObjectReference[];
        referencesToExclude?: SavedObjectReference[];
      } = {}
    ) => {
      return findListItems(
        getTypes(),
        searchTerm,
        listingLimit,
        references,
        referencesToExclude
      ).then(({ total, hits }: { total: number; hits: Array<Record<string, unknown>> }) => {
        const content = hits.map(toTableListViewSavedObject);

        visualizedUserContent.current = content;

        return {
          total,
          hits: content,
        };
      });
    },
    [listingLimit]
  );

  const onContentEditorSave = useCallback(
    async (args: { id: string; title: string; description?: string; tags: string[] }) => {
      const content = visualizedUserContent.current?.find(({ id }) => id === args.id);

      if (content) {
        await updateBasicSoAttributes(
          content.id,
          content.type,
          {
            title: args.title,
            description: args.description ?? '',
            tags: args.tags,
          },
          {
            overlays,
            savedObjectsTagging,
            typesService: getTypes(),
            contentManagement,
          }
        );
      }
    },
    [overlays, savedObjectsTagging, contentManagement]
  );

  const contentEditorValidators: OpenContentEditorParams['customValidators'] = useMemo(
    () => ({
      title: [
        {
          type: 'warning',
          async fn(value, id) {
            if (id) {
              const content = visualizedUserContent.current?.find((c) => c.id === id);
              if (content) {
                try {
                  await checkForDuplicateTitle(
                    {
                      id,
                      title: value,
                      lastSavedTitle: content.title,
                      getEsType: () => content.type,
                    },
                    false,
                    false,
                    () => {},
                    { overlays }
                  );
                } catch (e) {
                  return i18n.translate(
                    'visualizations.visualizeListingDeleteErrorTitle.duplicateWarning',
                    {
                      defaultMessage: 'Saving "{value}" creates a duplicate title.',
                      values: {
                        value,
                      },
                    }
                  );
                }
              }
            }
          },
        },
      ],
    }),
    [overlays]
  );

  const deleteItems = useCallback(
    async (selectedItems: object[]) => {
      await Promise.all(
        selectedItems.map((item: any) => savedObjects.client.delete(item.savedObjectType, item.id))
      ).catch((error) => {
        toastNotifications.addError(error, {
          title: i18n.translate('visualizations.visualizeListingDeleteErrorTitle', {
            defaultMessage: 'Error deleting visualization',
          }),
        });
      });
    },
    [savedObjects.client, toastNotifications]
  );

  const props: CustomTableViewProps = {
    findItems: fetchItems,
    deleteItems,
    contentEditor: {
      isReadonly: !visualizeCapabilities.save,
      onSave: onContentEditorSave,
      customValidators: contentEditorValidators,
    },
    editItem,
    emptyPrompt: noItemsFragment,
    createItem: createNewVis,
    rowItemActions: ({ managed, attributes: { readOnly } }) =>
      !visualizeCapabilities.save || readOnly
        ? {
            edit: {
              enabled: false,
              reason: managed
                ? i18n.translate('visualizations.managedLegacyVisMessage', {
                    defaultMessage:
                      'Elastic manages this visualisation. Changing it is not possible.',
                  })
                : i18n.translate('visualizations.readOnlyLegacyVisMessage', {
                    defaultMessage:
                      "These details can't be edited because this visualization is no longer supported.",
                  }),
            },
          }
        : undefined,
  };

  return props;
};

export const VisualizeListing = () => {
  const {
    services: {
      application,
      executionContext,
      chrome,
      history,
      stateTransferService,
      dashboardCapabilities,
      uiSettings,
      kbnUrlStateStorage,
      listingViewRegistry,
      serverless,
    },
  } = useKibana<VisualizeServices>();
  const { pathname } = useLocation();
  const closeNewVisModal = useRef(() => {});

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'list',
  });

  useEffect(() => {
    if (pathname === '/new') {
      // In case the user navigated to the page via the /visualize/new URL we start the dialog immediately
      closeNewVisModal.current = showNewVisModal({
        onClose: () => {
          // In case the user came via a URL to this page, change the URL to the regular landing page URL after closing the modal
          history.push(VisualizeConstants.LANDING_PAGE_PATH);
        },
      });
    } else {
      // close modal window if exists
      closeNewVisModal.current();
    }
  }, [history, pathname]);

  useMount(() => {
    // Reset editor state for all apps if the visualize listing page is loaded.
    stateTransferService.clearEditorState();
    if (serverless?.setBreadcrumbs) {
      // reset any deeper context breadcrumbs
      // "Visualization" breadcrumb is set automatically by the serverless navigation
      serverless.setBreadcrumbs([]);
    } else {
      chrome.setBreadcrumbs([
        {
          text: i18n.translate('visualizations.visualizeListingBreadcrumbsTitle', {
            defaultMessage: 'Visualize Library',
          }),
        },
      ]);
    }

    chrome.docTitle.change(
      i18n.translate('visualizations.listingPageTitle', { defaultMessage: 'Visualize Library' })
    );
  });
  useUnmount(() => closeNewVisModal.current());

  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

  const tableViewProps = useTableListViewProps(closeNewVisModal, listingLimit);

  const visualizeLibraryTitle = i18n.translate('visualizations.listing.table.listTitle', {
    defaultMessage: 'Visualize Library',
  });

  const visualizeTab: TableListTab<VisualizeUserContent> = useMemo(() => {
    const calloutMessage = (
      <FormattedMessage
        data-test-subj="visualize-dashboard-flow-prompt"
        id="visualizations.visualizeListingDashboardFlowDescription"
        defaultMessage="Building a dashboard? Create and add your visualizations right from the {dashboardApp}."
        values={{
          dashboardApp: (
            <EuiLink
              className="visListingCallout__link"
              onClick={(event: MouseEvent) => {
                event.preventDefault();
                application.navigateToUrl(application.getUrlForApp('dashboards'));
              }}
            >
              <FormattedMessage
                id="visualizations.visualizeListingDashboardAppName"
                defaultMessage="Dashboard application"
              />
            </EuiLink>
          ),
        }}
      />
    );

    return {
      title: 'Visualizations',
      id: 'visualizations',
      getTableList: (propsFromParent) => (
        <>
          {dashboardCapabilities.createNew && (
            <>
              <EuiCallOut size="s" title={calloutMessage} iconType="iInCircle" />
              <EuiSpacer size="m" />
            </>
          )}
          <TableListViewTable<VisualizeUserContent>
            id="vis"
            // we allow users to create visualizations even if they can't save them
            // for data exploration purposes
            customTableColumn={getCustomColumn()}
            listingLimit={listingLimit}
            initialPageSize={initialPageSize}
            initialFilter={''}
            entityName={i18n.translate('visualizations.listing.table.entityName', {
              defaultMessage: 'visualization',
            })}
            entityNamePlural={i18n.translate('visualizations.listing.table.entityNamePlural', {
              defaultMessage: 'visualizations',
            })}
            getOnClickTitle={(item) =>
              item.attributes.readOnly ? undefined : () => tableViewProps.editItem?.(item)
            }
            getDetailViewLink={({ editor, attributes: { error, readOnly } }) =>
              readOnly || (editor && 'onEdit' in editor)
                ? undefined
                : getVisualizeListItemLink(
                    application,
                    kbnUrlStateStorage,
                    editor.editApp,
                    editor.editUrl,
                    error
                  )
            }
            tableCaption={visualizeLibraryTitle}
            {...tableViewProps}
            {...propsFromParent}
          />
        </>
      ),
    };
  }, [
    application,
    dashboardCapabilities.createNew,
    initialPageSize,
    kbnUrlStateStorage,
    listingLimit,
    tableViewProps,
    visualizeLibraryTitle,
  ]);

  const tabs = useMemo(
    () => [visualizeTab, ...Array.from(listingViewRegistry as Set<TableListTab>)],
    [listingViewRegistry, visualizeTab]
  );

  const { activeTab } = useParams<{ activeTab: string }>();

  return (
    <TabbedTableListView
      headingId="visualizeListingHeading"
      title={visualizeLibraryTitle}
      tabs={tabs}
      activeTabId={activeTab}
      changeActiveTab={(id) => {
        application.navigateToUrl(`#/${id}`);
      }}
    />
  );
};
