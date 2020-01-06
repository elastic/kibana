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

/** READONLY VIEW CONSTANTS **/
export const emptyDashboardTitle: string = i18n.translate('kbn.dashboard.emptyDashboardTitle', {
  defaultMessage: 'This dashboard is empty or you do not have permission to view.',
});
export const emptyDashboardContactOwner = i18n.translate('kbn.dashboard.emptyDashboardTitle', {
  defaultMessage: 'Please contact the owner of the dashboard if you think this is an error.',
});
/** VIEW MODE CONSTANTS **/
export const fillDashboardTitle: string = i18n.translate('kbn.dashboard.fillDashboardTitle', {
  defaultMessage: 'This dashboard is empty. Let\u2019s fill it up!',
});
export const howToStartWorkingOnNewDashboardDescription1: string = i18n.translate(
  'kbn.dashboard.howToStartWorkingOnNewDashboardDescription1',
  {
    defaultMessage: 'Click',
  }
);
export const howToStartWorkingOnNewDashboardDescription2: string = i18n.translate(
  'kbn.dashboard.howToStartWorkingOnNewDashboardDescription2',
  {
    defaultMessage: 'in the menu bar above to start adding panels.',
  }
);
export const howToStartWorkingOnNewDashboardEditLinkText: string = i18n.translate(
  'kbn.dashboard.howToStartWorkingOnNewDashboardEditLinkText',
  {
    defaultMessage: 'Edit',
  }
);
export const howToStartWorkingOnNewDashboardEditLinkAriaLabel: string = i18n.translate(
  'kbn.dashboard.howToStartWorkingOnNewDashboardEditLinkAriaLabel',
  {
    defaultMessage: 'Edit dashboard',
  }
);
/** EDIT MODE CONSTANTS **/
export const addExistingVisualizationLinkText: string = i18n.translate(
  'kbn.dashboard.addExistingVisualizationLinkText',
  {
    defaultMessage: 'Add an existing',
  }
);
export const addExistingVisualizationLinkAriaLabel: string = i18n.translate(
  'kbn.dashboard.addVisualizationLinkAriaLabel',
  {
    defaultMessage: 'Add an existing visualization',
  }
);
export const addNewVisualizationDescription: string = i18n.translate(
  'kbn.dashboard.addNewVisualizationText',
  {
    defaultMessage: 'or new object to this dashboard',
  }
);
export const createNewVisualizationButton: string = i18n.translate(
  'kbn.dashboard.createNewVisualizationButton',
  {
    defaultMessage: 'Create new',
  }
);
export const createNewVisualizationButtonAriaLabel: string = i18n.translate(
  'kbn.dashboard.createNewVisualizationButtonAriaLabel',
  {
    defaultMessage: 'Create new visualization button',
  }
);
