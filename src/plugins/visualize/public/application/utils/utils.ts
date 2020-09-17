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
        href: `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/visualize.html`,
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
