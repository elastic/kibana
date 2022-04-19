/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { History } from 'history';
import type { ChromeStart, DocLinksStart } from '@kbn/core/public';
import type { Filter } from '@kbn/es-query';
import { redirectWhenMissing } from '@kbn/kibana-utils-plugin/public';
import { VisualizeConstants } from '../../../common/constants';
import { convertFromSerializedVis } from '../../utils/saved_visualize_utils';
import type { VisualizeServices, VisualizeEditorVisInstance } from '../types';

export const addHelpMenuToAppChrome = (chrome: ChromeStart, docLinks: DocLinksStart) => {
  chrome.setHelpExtension({
    appName: i18n.translate('visualizations.helpMenu.appName', {
      defaultMessage: 'Visualize Library',
    }),
    links: [
      {
        linkType: 'documentation',
        href: `${docLinks.links.visualize.guide}`,
      },
    ],
  });
};

export const addBadgeToAppChrome = (chrome: ChromeStart) => {
  chrome.setBadge({
    text: i18n.translate('visualizations.badge.readOnly.text', {
      defaultMessage: 'Read only',
    }),
    tooltip: i18n.translate('visualizations.badge.readOnly.tooltip', {
      defaultMessage: 'Unable to save visualizations to the library',
    }),
    iconType: 'glasses',
  });
};

export const getDefaultQuery = ({ data }: VisualizeServices) => {
  return data.query.queryString.getDefaultQuery();
};

export const visStateToEditorState = (
  visInstance: VisualizeEditorVisInstance,
  services: VisualizeServices
) => {
  const vis = visInstance.vis;
  const savedVisState = convertFromSerializedVis(vis.serialize());
  const savedVis = 'savedVis' in visInstance ? visInstance.savedVis : undefined;
  return {
    uiState:
      savedVis && savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : vis.uiState.toJSON(),
    query: vis.data.searchSource?.getOwnField('query') || getDefaultQuery(services),
    filters: (vis.data.searchSource?.getOwnField('filter') as Filter[]) || [],
    vis: { ...savedVisState.visState, title: vis.title },
    linked: savedVis && savedVis.id ? !!savedVis.savedSearchId : !!savedVisState.savedSearchId,
  };
};

export const redirectToSavedObjectPage = (
  services: VisualizeServices,
  error: any,
  savedVisualizationsId?: string
) => {
  const {
    history,
    setActiveUrl,
    toastNotifications,
    http: { basePath },
    application: { navigateToApp },
  } = services;
  const managementRedirectTarget = {
    app: 'management',
    path: `kibana/objects/savedVisualizations/${savedVisualizationsId}`,
  };
  redirectWhenMissing({
    history,
    navigateToApp,
    toastNotifications,
    basePath,
    mapping: {
      visualization: VisualizeConstants.LANDING_PAGE_PATH,
      search: managementRedirectTarget,
      'index-pattern': managementRedirectTarget,
      'index-pattern-field': managementRedirectTarget,
    },
    onBeforeRedirect() {
      setActiveUrl(VisualizeConstants.LANDING_PAGE_PATH);
    },
    theme: services.theme,
  })(error);
};

export function getVizEditorOriginatingAppUrl(history: History) {
  return `#/${history.location.pathname}${history.location.search}`;
}
