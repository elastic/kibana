import {
  getEmbeddableTitle as getEmbeddableTitleFromEmbeddables,
  getEmbeddableEditUrl as getEmbeddableEditUrlFromEmbeddables,
  getEmbeddableError as getEmbeddableErrorFromEmbeddables,
  getEmbeddable as getEmbeddableFromEmbeddables,
} from './embeddables';

import {
  getPanel as getPanelFromPanels,
  getPanelType as getPanelTypeFromPanels
} from './panels';

import {
  getViewMode as getViewModeFromView,
  getFullScreenMode as getFullScreenModeFromView,
  getMaximizedPanelId as getMaximizedPanelIdFromView
} from './view';

export const getPanels = state => state.panels;
export const getPanel = (state, panelId) => getPanelFromPanels(getPanels(state), panelId);
export const getPanelType = (state, panelId) => getPanelTypeFromPanels(getPanels(state), panelId);

export const getEmbeddables = state => state.embeddables;
export const getEmbeddable = (state, panelId) => getEmbeddableFromEmbeddables(getEmbeddables(state), panelId);
export const getEmbeddableError = (state, panelId) => getEmbeddableErrorFromEmbeddables(getEmbeddables(state), panelId);
export const getEmbeddableTitle = (state, panelId) => getEmbeddableTitleFromEmbeddables(getEmbeddables(state), panelId);
export const getEmbeddableEditUrl = (state, panelId) => getEmbeddableEditUrlFromEmbeddables(getEmbeddables(state), panelId);

export const getView = state => state.view;
export const getViewMode = state => getViewModeFromView(getView(state));
export const getFullScreenMode = state => getFullScreenModeFromView(getView(state));
export const getMaximizedPanelId = state => getMaximizedPanelIdFromView(getView(state));
