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
import { ViewMode } from '../../../../../../plugins/embeddable/public';

/**
 * @param title {string} the current title of the dashboard
 * @param viewMode {DashboardViewMode} the current mode. If in editing state, prepends 'Editing ' to the title.
 * @param isDirty {boolean} if the dashboard is in a dirty state. If in dirty state, adds (unsaved) to the
 * end of the title.
 * @returns {string} A title to display to the user based on the above parameters.
 */
export function getDashboardTitle(
  title: string,
  viewMode: ViewMode,
  isDirty: boolean,
  isNew: boolean
): string {
  const isEditMode = viewMode === ViewMode.EDIT;
  let displayTitle: string;
  const newDashboardTitle = i18n.translate('kbn.dashboard.savedDashboard.newDashboardTitle', {
    defaultMessage: 'New Dashboard',
  });
  const dashboardTitle = isNew ? newDashboardTitle : title;

  if (isEditMode && isDirty) {
    displayTitle = i18n.translate('kbn.dashboard.strings.dashboardUnsavedEditTitle', {
      defaultMessage: 'Editing {title} (unsaved)',
      values: { title: dashboardTitle },
    });
  } else if (isEditMode) {
    displayTitle = i18n.translate('kbn.dashboard.strings.dashboardEditTitle', {
      defaultMessage: 'Editing {title}',
      values: { title: dashboardTitle },
    });
  } else {
    displayTitle = dashboardTitle;
  }

  return displayTitle;
}
