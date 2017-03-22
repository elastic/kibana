import { DashboardViewMode } from './dashboard_view_mode';
import _ from 'lodash';

/**
 * @param list {Array.<string>}
 * @returns {string} The list of strings concatenated with commas so it can be used in a message.
 * E.g. ['a', 'b', 'c'] returns 'a, b, and c'.
 */
export function createStringList(list) {
  const listClone = _.clone(list);
  const isPlural = list.length > 1;
  const lastEntry = isPlural ? `, and ${list[list.length - 1]}` : '';
  if (isPlural) listClone.splice(-1, 1);

  return `${listClone.join(', ')}${lastEntry}`;
}

/**
 * @param changedFilters {Array.<string>} An optional list of filter types that have changed.
 * @returns {string} A warning message to display to the user that they are going to lose changes.
 */
export function getUnsavedChangesWarningMessage(changedFilters) {
  const changedFilterList = createStringList(changedFilters);

  return changedFilterList ?
    `Are you sure you want to cancel and lose changes, including changes made to your ${changedFilterList}?` :
    `Are you sure you want to cancel and lose changes?`;
}

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
