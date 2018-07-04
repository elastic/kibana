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

import { createAction } from 'redux-actions';
import { KibanaAction } from '../../selectors/types';
import { PanelId, PanelsMap, PanelState } from '../selectors';

export enum PanelActionTypeKeys {
  DELETE_PANEL = 'DELETE_PANEL',
  UPDATE_PANEL = 'UPDATE_PANEL',
  RESET_PANEl_TITLE = 'RESET_PANEl_TITLE',
  SET_PANEl_TITLE = 'SET_PANEl_TITLE',
  UPDATE_PANELS = 'UPDATE_PANELS',
  SET_PANELS = 'SET_PANELS',
}

export interface DeletePanelAction
  extends KibanaAction<PanelActionTypeKeys.DELETE_PANEL, PanelId> {}

export interface UpdatePanelAction
  extends KibanaAction<PanelActionTypeKeys.UPDATE_PANEL, PanelState> {}

export interface UpdatePanelsAction
  extends KibanaAction<PanelActionTypeKeys.UPDATE_PANELS, PanelsMap> {}

export interface ResetPanelTitleAction
  extends KibanaAction<PanelActionTypeKeys.RESET_PANEl_TITLE, PanelId> {}

export interface SetPanelTitleActionPayload {
  panelId: PanelId;
  title: string;
}

export interface SetPanelTitleAction
  extends KibanaAction<
      PanelActionTypeKeys.SET_PANEl_TITLE,
      SetPanelTitleActionPayload
    > {}

export interface SetPanelsAction
  extends KibanaAction<PanelActionTypeKeys.SET_PANELS, PanelsMap> {}

export type PanelActions =
  | DeletePanelAction
  | UpdatePanelAction
  | ResetPanelTitleAction
  | UpdatePanelsAction
  | SetPanelTitleAction
  | SetPanelsAction;

export const deletePanel = createAction<PanelId>(
  PanelActionTypeKeys.DELETE_PANEL
);
export const updatePanel = createAction<PanelState>(
  PanelActionTypeKeys.UPDATE_PANEL
);
export const resetPanelTitle = createAction<PanelId>(
  PanelActionTypeKeys.RESET_PANEl_TITLE
);
export const setPanelTitle = createAction<SetPanelTitleActionPayload>(
  PanelActionTypeKeys.SET_PANEl_TITLE
);
export const updatePanels = createAction<PanelsMap>(
  PanelActionTypeKeys.UPDATE_PANELS
);
export const setPanels = createAction<PanelsMap>(
  PanelActionTypeKeys.SET_PANELS
);
