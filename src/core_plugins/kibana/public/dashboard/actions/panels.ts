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

import { Action } from 'redux';
import { createAction } from 'redux-actions';
import { PanelId, PanelsMap, PanelState } from '../selectors';

export enum PanelActionTypeKeys {
  DELETE_PANEL = 'DELETE_PANEL',
  UPDATE_PANEL = 'UPDATE_PANEL',
  RESET_PANEl_TITLE = 'RESET_PANEl_TITLE',
  SET_PANEl_TITLE = 'SET_PANEl_TITLE',
  UPDATE_PANELS = 'UPDATE_PANELS',
  SET_PANELS = 'SET_PANELS',
}

export interface DeletePanelAction extends Action {
  type: PanelActionTypeKeys.DELETE_PANEL;
  payload: PanelId;
}

export interface UpdatePanelAction extends Action {
  type: PanelActionTypeKeys.UPDATE_PANEL;
  payload: PanelState;
}

export interface UpdatePanelsAction extends Action {
  type: PanelActionTypeKeys.UPDATE_PANELS;
  payload: PanelsMap;
}

export interface ResetPanelTitleAction extends Action {
  type: PanelActionTypeKeys.RESET_PANEl_TITLE;
  /**
   * The PanelId of the panel whose title should be reset.
   */
  payload: PanelId;
}

export interface SetPanelTitleActionPayload {
  panelId: PanelId;
  title: string;
}

export interface SetPanelTitleAction extends Action {
  type: PanelActionTypeKeys.SET_PANEl_TITLE;
  payload: SetPanelTitleActionPayload;
}

export interface SetPanelsAction extends Action {
  type: PanelActionTypeKeys.SET_PANELS;
  payload: PanelsMap;
}

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
