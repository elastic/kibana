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

import { addHelpMenuToAppChrome } from '../help_menu/help_menu_util';
import { VisualizeListingTable } from './visualize_listing_table';

import { VisualizeConstants } from '../visualize_constants';
import { i18n } from '@kbn/i18n';

import { getServices } from '../../kibana_services';
import { wrapInI18nContext } from '../../legacy_imports';

export function initListingDirective(app) {
  app.directive('visualizeListingTable', reactDirective =>
    reactDirective(wrapInI18nContext(VisualizeListingTable))
  );
}

export function VisualizeListingController($injector, $scope, createNewVis) {
  const {
    addBasePath,
    chrome,
    savedObjectsClient,
    savedVisualizations,
    data: {
      query: {
        timefilter: { timefilter },
      },
    },
    toastNotifications,
    uiSettings,
    visualizations,
    core: { docLinks, savedObjects },
  } = getServices();
  const kbnUrl = $injector.get('kbnUrl');

  timefilter.disableAutoRefreshSelector();
  timefilter.disableTimeRangeSelector();

  this.addBasePath = addBasePath;
  this.uiSettings = uiSettings;
  this.savedObjects = savedObjects;

  this.createNewVis = () => {
    this.closeNewVisModal = visualizations.showNewVisModal();
  };

  this.editItem = ({ editUrl }) => {
    // for visualizations the edit and view URLs are the same
    window.location.href = addBasePath(editUrl);
  };

  this.getViewUrl = ({ editUrl }) => {
    return addBasePath(editUrl);
  };

  if (createNewVis) {
    // In case the user navigated to the page via the /visualize/new URL we start the dialog immediately
    this.closeNewVisModal = visualizations.showNewVisModal({
      onClose: () => {
        // In case the user came via a URL to this page, change the URL to the regular landing page URL after closing the modal
        kbnUrl.changePath(VisualizeConstants.LANDING_PAGE_PATH);
      },
    });
  }

  this.fetchItems = filter => {
    const isLabsEnabled = uiSettings.get('visualize:enableLabs');
    return savedVisualizations
      .findListItems(filter, uiSettings.get('savedObjects:listingLimit'))
      .then(result => {
        this.totalItems = result.total;

        return {
          total: result.total,
          hits: result.hits.filter(result => isLabsEnabled || result.type.stage !== 'experimental'),
        };
      });
  };

  this.deleteSelectedItems = function deleteSelectedItems(selectedItems) {
    return Promise.all(
      selectedItems.map(item => {
        return savedObjectsClient.delete(item.savedObjectType, item.id);
      })
    ).catch(error => {
      toastNotifications.addError(error, {
        title: i18n.translate('kbn.visualize.visualizeListingDeleteErrorTitle', {
          defaultMessage: 'Error deleting visualization',
        }),
      });
    });
  };

  chrome.setBreadcrumbs([
    {
      text: i18n.translate('kbn.visualize.visualizeListingBreadcrumbsTitle', {
        defaultMessage: 'Visualize',
      }),
    },
  ]);

  this.listingLimit = uiSettings.get('savedObjects:listingLimit');

  addHelpMenuToAppChrome(chrome, docLinks);

  $scope.$on('$destroy', () => {
    if (this.closeNewVisModal) {
      this.closeNewVisModal();
    }
  });
}
