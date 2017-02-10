import { DashboardViewMode } from './dashboard_view_mode';
import _ from 'lodash';

export class DashboardStrings {

  static createStringList(list) {
    const listClone = _.clone(list);
    const isPlural = list.length > 1;
    const lastEntry = isPlural ? `, and ${list[list.length - 1]}` : '';
    if (isPlural) listClone.splice(-1, 1);

    return `${listClone.join(', ')}${lastEntry}`;
  }

  static getUnsavedChangesWarningMessage(dashboardState) {
    const changedFilters = dashboardState.getChangedFiltersForDisplay();
    const changedFilterList = this.createStringList(changedFilters);
    const saveOrLoseMessage = 'You can save them or exit without saving and lose your changes.';

    return changedFilterList ?
      `You have unsaved changes, including changes to your ${changedFilterList}. ${saveOrLoseMessage}` :
      `You have unsaved changes. ${saveOrLoseMessage}`;
  }

  static getDashboardTitle(dashboardState) {
    const isEditMode = dashboardState.getViewMode() === DashboardViewMode.EDIT;
    const unsavedSuffix = isEditMode && dashboardState.getIsDirty()
      ? ' (unsaved)'
      : '';

    const displayTitle = `${dashboardState.getTitle()}${unsavedSuffix}`;
    return isEditMode ? 'Editing ' + displayTitle : displayTitle;
  }
}
