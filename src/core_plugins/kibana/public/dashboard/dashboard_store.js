import { DashboardViewMode } from './dashboard_view_mode';

/**
 * This is a poor name choice for this state but we have dashboard_state and DashboardState to contend with.
 * Redux state trees hold no logic, while DashboardState does, and is tightly somewhat tightly to angular. The
 * end goal will be to replace dashboard_state with this component, and then we can improve the naming.
 *
 * @type {{}}
 */
export function getInitialState() {
  return {
    panels: {}, // Mapping of panel ids to panel state
    // Mapping of panel id to the function that should be used to destroy the rendered embeddable:
    embeddables: {}, // Panel id to embeddable object
    isFullScreenMode: false,
    viewMode: DashboardViewMode.VIEW,
    maximizedPanelId: undefined
  }
}
