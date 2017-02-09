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

  static getFiltersDifferWarningMessage(dashboardState) {
    const changedFilters = dashboardState.getChangedFiltersForDisplay();
    const changedFilterList = this.createStringList(changedFilters);
    const thoseOrThat = changedFilters.length > 1 ? 'those' : 'that';
    const isOrAre = changedFilters.length > 1 ? 'are' : 'is';
    return `Your current ${changedFilterList} ${isOrAre} different than ${thoseOrThat} stored with your dashboard.`;
  }

  static getDashboardTitle(dashboardState) {
    const displayTitle = dashboardState.dashboard.lastSavedTitle || `${dashboardState.dashboard.title} (unsaved)`;
    const isEditMode = dashboardState.getViewMode() === DashboardViewMode.EDIT;
    return isEditMode ? 'Editing ' + displayTitle : displayTitle;
  }
}
