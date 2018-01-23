import { DashboardViewMode } from './dashboard_view_mode';

/**
 * @param title {string} the current title of the dashboard
 * @param viewMode {DashboardViewMode} the current mode. If in editing state, prepends 'Editing ' to the title.
 * @param isDirty {boolean} if the dashboard is in a dirty state. If in dirty state, adds (unsaved) to the
 * end of the title.
 * @returns {string} A title to display to the user based on the above parameters.
 */
export function getDashboardTitle(title, viewMode, isDirty) {
  const isEditMode = viewMode === DashboardViewMode.EDIT;
  const unsavedSuffix = isEditMode && isDirty
    ? ' (unsaved)'
    : '';

  const displayTitle = `${title}${unsavedSuffix}`;
  return isEditMode ? 'Editing ' + displayTitle : displayTitle;
}
