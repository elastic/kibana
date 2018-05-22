import { updateSavedDashboard } from './update_saved_dashboard';

/**
 * Saves the dashboard.
 * @param toJson {function} A custom toJson function. Used because the previous code used
 * the angularized toJson version, and it was unclear whether there was a reason not to use
 * JSON.stringify
 * @param timeFilter
 * @param dashboardStateManager {DashboardStateManager}
 * @param {object} [saveOptions={}]
 * @property {boolean} [saveOptions.confirmOverwrite=false] - If true, attempts to create the source so it
 * can confirm an overwrite if a document with the id already exists.
 * @property {boolean} [saveOptions.isTitleDuplicateConfirmed=false] - If true, save allowed with duplicate title
 * @property {func} [saveOptions.onTitleDuplicate] - function called if duplicate title exists.
 * When not provided, confirm modal will be displayed asking user to confirm or cancel save.
 * @returns {Promise<string>} A promise that if resolved, will contain the id of the newly saved
 * dashboard.
 */
export function saveDashboard(toJson, timeFilter, dashboardStateManager, saveOptions) {
  dashboardStateManager.saveState();

  const savedDashboard = dashboardStateManager.savedDashboard;
  const appState = dashboardStateManager.appState;

  updateSavedDashboard(savedDashboard, appState, timeFilter, toJson);

  return savedDashboard.save(saveOptions)
    .then((id) => {
      dashboardStateManager.lastSavedDashboardFilters = dashboardStateManager.getFilterState();
      dashboardStateManager.resetState();
      return id;
    });
}
