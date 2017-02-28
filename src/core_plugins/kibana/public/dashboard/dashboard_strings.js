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

    return changedFilterList ?
      `Are you sure you want to cancel and lose changes, including changes made to your ${changedFilterList}?` :
      `Are you sure you want to cancel and lose changes?`;
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
