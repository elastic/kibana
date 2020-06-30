/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './visualize_listing.scss';

import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useUnmount, useMount } from 'react-use';
import { useLocation } from 'react-router-dom';

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
      history,
      savedVisualizations,
      toastNotifications,
      visualizations,
      savedObjects,
      savedObjectsPublic,
      uiSettings,
      visualizeCapabilities,
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
    chrome.setBreadcrumbs([
      {
        text: i18n.translate('visualize.visualizeListingBreadcrumbsTitle', {
          defaultMessage: 'Visualize',
        }),
      },
    ]);
    chrome.docTitle.change(
      i18n.translate('visualize.listingPageTitle', { defaultMessage: 'Visualize' })
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
  const tableColumns = useMemo(() => getTableColumns(application, history), [application, history]);

  const fetchItems = useCallback(
    (filter) => {
      const isLabsEnabled = uiSettings.get(VISUALIZE_ENABLE_LABS_SETTING);
      return savedVisualizations
        .findListItems(filter, listingLimit)
        .then(({ total, hits }: { total: number; hits: object[] }) => ({
          total,
          hits: hits.filter((result: any) => isLabsEnabled || result.type.stage !== 'experimental'),
        }));
    },
    [listingLimit, savedVisualizations, uiSettings]
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

  return (
    <TableListView
      headingId="visualizeListingHeading"
      // we allow users to create visualizations even if they can't save them
      // for data exploration purposes
      createItem={createNewVis}
      findItems={fetchItems}
      deleteItems={visualizeCapabilities.delete ? deleteItems : undefined}
      editItem={visualizeCapabilities.save ? editItem : undefined}
      tableColumns={tableColumns}
      listingLimit={listingLimit}
      initialPageSize={savedObjectsPublic.settings.getPerPage()}
      initialFilter={''}
      noItemsFragment={noItemsFragment}
      entityName={i18n.translate('visualize.listing.table.entityName', {
        defaultMessage: 'visualization',
      })}
      entityNamePlural={i18n.translate('visualize.listing.table.entityNamePlural', {
        defaultMessage: 'visualizations',
      })}
      tableListTitle={i18n.translate('visualize.listing.table.listTitle', {
        defaultMessage: 'Visualizations',
      })}
      toastNotifications={toastNotifications}
    />
  );
};
