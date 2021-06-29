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
import { FormattedMessage } from '@kbn/i18n/react';
import useUnmount from 'react-use/lib/useUnmount';
import useMount from 'react-use/lib/useMount';

import { useLocation } from 'react-router-dom';

import { SavedObjectsFindOptionsReference } from '../../../../../core/public';
import { useKibana, TableListView } from '../../../../kibana_react/public';
import { VISUALIZE_ENABLE_LABS_SETTING } from '../../../../visualizations/public';
import { VisualizeServices } from '../types';
import { VisualizeConstants } from '../visualize_constants';
import { getTableColumns, getNoItemsMessage } from '../utils';

export const VisualizeListing = () => {
  const {
    services: {
      application,
      chrome,
      dashboard,
      history,
      savedVisualizations,
      toastNotifications,
      visualizations,
      stateTransferService,
      savedObjects,
      savedObjectsPublic,
      savedObjectsTagging,
      uiSettings,
      visualizeCapabilities,
      dashboardCapabilities,
      kbnUrlStateStorage,
    },
  } = useKibana<VisualizeServices>();
  const { pathname } = useLocation();
  const closeNewVisModal = useRef(() => {});
  const listingLimit = savedObjectsPublic.settings.getListingLimit();

  useEffect(() => {
    if (pathname === '/new') {
      // In case the user navigated to the page via the /visualize/new URL we start the dialog immediately
      closeNewVisModal.current = visualizations.showNewVisModal({
        onClose: () => {
          // In case the user came via a URL to this page, change the URL to the regular landing page URL after closing the modal
          history.push(VisualizeConstants.LANDING_PAGE_PATH);
        },
      });
    } else {
      // close modal window if exists
      closeNewVisModal.current();
    }
  }, [history, pathname, visualizations]);

  useMount(() => {
    // Reset editor state for all apps if the visualize listing page is loaded.
    stateTransferService.clearEditorState();
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('visualize.visualizeListingBreadcrumbsTitle', {
          defaultMessage: 'Visualize Library',
        }),
      },
    ]);
    chrome.docTitle.change(
      i18n.translate('visualize.listingPageTitle', { defaultMessage: 'Visualize Library' })
    );
  });
  useUnmount(() => closeNewVisModal.current());

  const createNewVis = useCallback(() => {
    closeNewVisModal.current = visualizations.showNewVisModal();
  }, [visualizations]);

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
      return savedVisualizations
        .findListItems(searchTerm, { size: listingLimit, references })
        .then(({ total, hits }: { total: number; hits: object[] }) => ({
          total,
          hits: hits.filter(
            (result: any) => isLabsEnabled || result.type?.stage !== 'experimental'
          ),
        }));
    },
    [listingLimit, savedVisualizations, uiSettings, savedObjectsTagging]
  );

  const deleteItems = useCallback(
    async (selectedItems: object[]) => {
      await Promise.all(
        selectedItems.map((item: any) => savedObjects.client.delete(item.savedObjectType, item.id))
      ).catch((error) => {
        toastNotifications.addError(error, {
          title: i18n.translate('visualize.visualizeListingDeleteErrorTitle', {
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
      id="visualize.visualizeListingDashboardFlowDescription"
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
              id="visualize.visualizeListingDashboardAppName"
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
      tableCaption={i18n.translate('visualize.listing.table.listTitle', {
        defaultMessage: 'Visualize Library',
      })}
      findItems={fetchItems}
      deleteItems={visualizeCapabilities.delete ? deleteItems : undefined}
      editItem={visualizeCapabilities.save ? editItem : undefined}
      tableColumns={tableColumns}
      listingLimit={listingLimit}
      initialPageSize={savedObjectsPublic.settings.getPerPage()}
      initialFilter={''}
      rowHeader="title"
      emptyPrompt={noItemsFragment}
      entityName={i18n.translate('visualize.listing.table.entityName', {
        defaultMessage: 'visualization',
      })}
      entityNamePlural={i18n.translate('visualize.listing.table.entityNamePlural', {
        defaultMessage: 'visualizations',
      })}
      tableListTitle={i18n.translate('visualize.listing.table.listTitle', {
        defaultMessage: 'Visualize Library',
      })}
      toastNotifications={toastNotifications}
      searchFilters={searchFilters}
    >
      {dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables &&
        dashboardCapabilities.createNew && (
          <>
            <EuiCallOut size="s" title={calloutMessage} iconType="iInCircle" />
            <EuiSpacer size="m" />
          </>
        )}
    </TableListView>
  );
};
