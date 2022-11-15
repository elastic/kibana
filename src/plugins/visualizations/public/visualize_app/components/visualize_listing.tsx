/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './visualize_listing.scss';

import React, { useCallback, useRef, useMemo, useEffect, MouseEvent } from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useUnmount from 'react-use/lib/useUnmount';
import useMount from 'react-use/lib/useMount';

import { useLocation } from 'react-router-dom';

import { SavedObjectsFindOptionsReference } from '@kbn/core/public';
import { useKibana, useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { TableListView } from '@kbn/content-management-table-list';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list';
import { findListItems } from '../../utils/saved_visualize_utils';
import { showNewVisModal } from '../../wizard';
import { getTypes } from '../../services';
import {
  VISUALIZE_ENABLE_LABS_SETTING,
  SAVED_OBJECTS_LIMIT_SETTING,
  SAVED_OBJECTS_PER_PAGE_SETTING,
} from '../..';
import type { VisualizationListItem } from '../..';
import { VisualizeServices } from '../types';
import { VisualizeConstants } from '../../../common/constants';
import { getNoItemsMessage, getCustomColumn } from '../utils';
import { getVisualizeListItemLink } from '../utils/get_visualize_list_item_link';
import { VisualizationStage } from '../../vis_types/vis_type_alias_registry';

interface VisualizeUserContent extends VisualizationListItem, UserContentCommonSchema {
  type: string;
  attributes: {
    title: string;
    description?: string;
    editApp: string;
    editUrl: string;
    error?: string;
  };
}

const toTableListViewSavedObject = (savedObject: Record<string, unknown>): VisualizeUserContent => {
  return {
    id: savedObject.id as string,
    updatedAt: savedObject.updatedAt as string,
    references: savedObject.references as Array<{ id: string; type: string; name: string }>,
    type: savedObject.savedObjectType as string,
    editUrl: savedObject.editUrl as string,
    editApp: savedObject.editApp as string,
    icon: savedObject.icon as string,
    stage: savedObject.stage as VisualizationStage,
    savedObjectType: savedObject.savedObjectType as string,
    typeTitle: savedObject.typeTitle as string,
    title: (savedObject.title as string) ?? '',
    error: (savedObject.error as string) ?? '',
    attributes: {
      title: (savedObject.title as string) ?? '',
      description: savedObject.description as string,
      editApp: savedObject.editApp as string,
      editUrl: savedObject.editUrl as string,
      error: savedObject.error as string,
    },
  };
};

export const VisualizeListing = () => {
  const {
    services: {
      core,
      application,
      executionContext,
      chrome,
      history,
      toastNotifications,
      stateTransferService,
      savedObjects,
      uiSettings,
      visualizeCapabilities,
      dashboardCapabilities,
      kbnUrlStateStorage,
    },
  } = useKibana<VisualizeServices>();
  const { pathname } = useLocation();
  const closeNewVisModal = useRef(() => {});
  const listingLimit = uiSettings.get(SAVED_OBJECTS_LIMIT_SETTING);
  const initialPageSize = uiSettings.get(SAVED_OBJECTS_PER_PAGE_SETTING);

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
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('visualizations.visualizeListingBreadcrumbsTitle', {
          defaultMessage: 'Visualize Library',
        }),
      },
    ]);
    chrome.docTitle.change(
      i18n.translate('visualizations.listingPageTitle', { defaultMessage: 'Visualize Library' })
    );
  });
  useUnmount(() => closeNewVisModal.current());

  const createNewVis = useCallback(() => {
    closeNewVisModal.current = showNewVisModal();
  }, []);

  const editItem = useCallback(
    ({ attributes: { editUrl, editApp } }: VisualizeUserContent) => {
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
        references?: SavedObjectsFindOptionsReference[];
        referencesToExclude?: SavedObjectsFindOptionsReference[];
      } = {}
    ) => {
      const isLabsEnabled = uiSettings.get(VISUALIZE_ENABLE_LABS_SETTING);
      return findListItems(
        savedObjects.client,
        getTypes(),
        searchTerm,
        listingLimit,
        references,
        referencesToExclude
      ).then(({ total, hits }: { total: number; hits: Array<Record<string, unknown>> }) => ({
        total,
        hits: hits
          .filter((result: any) => isLabsEnabled || result.type?.stage !== 'experimental')
          .map(toTableListViewSavedObject),
      }));
    },
    [listingLimit, uiSettings, savedObjects.client]
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

  return (
    <TableListView<VisualizeUserContent>
      id="vis"
      headingId="visualizeListingHeading"
      // we allow users to create visualizations even if they can't save them
      // for data exploration purposes
      createItem={createNewVis}
      findItems={fetchItems}
      deleteItems={visualizeCapabilities.delete ? deleteItems : undefined}
      editItem={visualizeCapabilities.save ? editItem : undefined}
      customTableColumn={getCustomColumn()}
      listingLimit={listingLimit}
      initialPageSize={initialPageSize}
      initialFilter={''}
      emptyPrompt={noItemsFragment}
      entityName={i18n.translate('visualizations.listing.table.entityName', {
        defaultMessage: 'visualization',
      })}
      entityNamePlural={i18n.translate('visualizations.listing.table.entityNamePlural', {
        defaultMessage: 'visualizations',
      })}
      tableListTitle={i18n.translate('visualizations.listing.table.listTitle', {
        defaultMessage: 'Visualize Library',
      })}
      getDetailViewLink={({ attributes: { editApp, editUrl, error } }) =>
        getVisualizeListItemLink(core.application, kbnUrlStateStorage, editApp, editUrl, error)
      }
    >
      {dashboardCapabilities.createNew && (
        <>
          <EuiCallOut size="s" title={calloutMessage} iconType="iInCircle" />
          <EuiSpacer size="m" />
        </>
      )}
    </TableListView>
  );
};
