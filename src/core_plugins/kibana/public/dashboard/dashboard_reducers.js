import _ from 'lodash';

import {
  UPDATE_PANELS,
  EMBEDDABLE_RENDER_FINISHED,
  EMBEDDABLE_RENDER_ERROR,
  UPDATE_VIEW_MODE,
  UPDATE_MAXIMIZED_PANEl_ID,
  DELETE_PANEL,
  UPDATE_PANEL,
  ADD_NEW_PANEl,
  UPDATE_IS_FULL_SCREEN_MODE
} from './action_types';

import { getInitialState } from './dashboard_store';

export const dashboardReducers = (state = getInitialState(), action) => {
  switch (action.type) {
    case EMBEDDABLE_RENDER_FINISHED: {
      return {
        ...state,
        embeddables: {
          ...state.embeddables,
          [action.panelId]: action.embeddable
        },
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            renderError: null
          }
        }
      };
    }
    case UPDATE_PANELS: {
      return {
        ...state,
        panels: _.cloneDeep(action.panels)
      }
    }
    case UPDATE_PANEL: {
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panel.panelIndex]: _.defaultsDeep(state.panels[action.panel.panelIndex], action.panel)
        }
      }
    }
    case ADD_NEW_PANEl: {
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panel.panelIndex]: action.panel
        }
      }
    }
    case UPDATE_VIEW_MODE: {
      return {
        ...state,
        viewMode: action.viewMode
      }
    }
    case UPDATE_IS_FULL_SCREEN_MODE: {
      return {
        ...state,
        isFullScreenMode: action.isFullScreenMode
      }
    }
    case UPDATE_MAXIMIZED_PANEl_ID: {
      return {
        ...state,
        maximizedPanelId: action.maximizedPanelId
      }
    }
    case EMBEDDABLE_RENDER_ERROR: {
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panelId]: {
            ...state.panels[action.panelId],
            renderError: action.error
          }
        }
      }
    }
    case DELETE_PANEL: {
      const stateCopy = {
        ...state,
        panels: {
          ...state.panels
        },
        embeddables: {
          ...state.embeddables
        }
      };
      delete stateCopy.panels[action.panelId];
      delete stateCopy.embeddables[action.panelId];
      return stateCopy;
    }
    default:
      return state;
  }
};
