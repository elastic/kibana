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

import { connect } from 'react-redux';
import { DashboardViewport } from './dashboard_viewport';
import { updateIsFullScreenMode } from '../actions';
import {
  getMaximizedPanelId,
  getPanels,
  getTitle,
  getDescription,
  getUseMargins,
  getFullScreenMode,
} from '../selectors';

const mapStateToProps = ({ dashboard }) => {
  const maximizedPanelId = getMaximizedPanelId(dashboard);
  return {
    maximizedPanelId,
    panelCount: Object.keys(getPanels(dashboard)).length,
    description: getDescription(dashboard),
    title: getTitle(dashboard),
    useMargins: getUseMargins(dashboard),
    isFullScreenMode: getFullScreenMode(dashboard),
  };
};

const mapDispatchToProps = (dispatch) => ({
  onExitFullScreenMode: () => dispatch(updateIsFullScreenMode(false)),
});

export const DashboardViewportContainer = connect(
  mapStateToProps,
  mapDispatchToProps,
)(DashboardViewport);
