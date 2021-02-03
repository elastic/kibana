/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { ChromeStart, DocLinksStart } from 'kibana/public';
import { Filter } from '../../../../data/public';
import { VisualizeServices, VisualizeEditorVisInstance } from '../types';

export const addHelpMenuToAppChrome = (chrome: ChromeStart, docLinks: DocLinksStart) => {
  chrome.setHelpExtension({
    appName: i18n.translate('visualize.helpMenu.appName', {
      defaultMessage: 'Visualize',
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
    text: i18n.translate('visualize.badge.readOnly.text', {
      defaultMessage: 'Read only',
    }),
    tooltip: i18n.translate('visualize.badge.readOnly.tooltip', {
      defaultMessage: 'Unable to save visualizations',
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
  const savedVisState = services.visualizations.convertFromSerializedVis(vis.serialize());
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
