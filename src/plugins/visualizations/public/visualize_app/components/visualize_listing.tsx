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

import { findListItems } from '../../utils/saved_visualize_utils';
import { showNewVisModal } from '../../wizard';
import { getTypes } from '../../services';
import { SavedObjectsFindOptionsReference } from '../../../../../core/public';
import { useKibana, TableListView, useExecutionContext } from '../../../../kibana_react/public';
import {
  VISUALIZE_ENABLE_LABS_SETTING,
  SAVED_OBJECTS_LIMIT_SETTING,
  SAVED_OBJECTS_PER_PAGE_SETTING,
} from '../../../../visualizations/public';
import { VisualizeServices } from '../types';
import { VisualizeConstants } from '../../../common/constants';
import { getTableColumns, getNoItemsMessage } from '../utils';

export const VisualizeListing = () => {
  const {
    services: {
      application,
      executionContext,
      chrome,
      history,
      toastNotifications,
      stateTransferService,
      savedObjects,
      savedObjectsTagging,
      uiSettings,
      visualizeCapabilities,
      dashboardCapabilities,
      kbnUrlStateStorage,
      theme,
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
    ({ editUrl, editApp }) => {
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
  const tableColumns = useMemo(
    () => getTableColumns(application, kbnUrlStateStorage, savedObjectsTagging),
    [application, kbnUrlStateStorage, savedObjectsTagging]
  );

  const fetchItems = useCallback(
    (filter) => {
      let searchTerm = filter;
      let references: SavedObjectsFindOptionsReference[] | undefined;

      if (savedObjectsTagging) {
        const parsedQuery = savedObjectsTagging.ui.parseSearchQuery(filter, { useName: true });
        searchTerm = parsedQuery.searchTerm;
        references = parsedQuery.tagReferences;
      }

      const isLabsEnabled = uiSettings.get(VISUALIZE_ENABLE_LABS_SETTING);
      return findListItems(
        savedObjects.client,
        getTypes(),
        searchTerm,
        listingLimit,
        references
      ).then(({ total, hits }: { total: number; hits: Array<Record<string, unknown>> }) => ({
        total,
        hits: hits.filter((result: any) => isLabsEnabled || result.type?.stage !== 'experimental'),
      }));
    },
    [listingLimit, uiSettings, savedObjectsTagging, savedObjects.client]
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

  const searchFilters = useMemo(() => {
    return savedObjectsTagging
      ? [savedObjectsTagging.ui.getSearchBarFilter({ useName: true })]
      : [];
  }, [savedObjectsTagging]);

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
    <TableListView
      headingId="visualizeListingHeading"
      // we allow users to create visualizations even if they can't save them
      // for data exploration purposes
      createItem={createNewVis}
      tableCaption={i18n.translate('visualizations.listing.table.listTitle', {
        defaultMessage: 'Visualize Library',
      })}
      findItems={fetchItems}
      deleteItems={visualizeCapabilities.delete ? deleteItems : undefined}
      editItem={visualizeCapabilities.save ? editItem : undefined}
      tableColumns={tableColumns}
      listingLimit={listingLimit}
      initialPageSize={initialPageSize}
      initialFilter={''}
      rowHeader="title"
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
      toastNotifications={toastNotifications}
      searchFilters={searchFilters}
      theme={theme}
      application={application}
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
