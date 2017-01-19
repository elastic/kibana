
import stateMonitorFactory  from 'ui/state_management/state_monitor_factory';

export class DashboardAppStateManager {
  constructor(stateDefaults, AppState) {
    let temporaryStateMonitor;
    let persistedStateMonitor;

    let temporaryAppState;
    let persistedAppState;

    this.appState = new AppState(stateDefaults);
    this.uiState = this.appState.makeStateful('uiState');
    this.$appStatus = {};

    // watch for state changes and update the appStatus.dirty value
    this.stateMonitor = stateMonitorFactory.create($state, stateDefaults);
    this.stateMonitor.onChange((status) => {
      $appStatus.dirty = status.dirty;
    });

    this.viewMode = currentViewMode;
  }

  onViewModeChanged(newMode) {
    this.viewMode = newMode;

  }

  destroy() {
    this.stateMonitor.destroy();
  }
}


function resetState(dashboardStateManager, newAppState) {
  dashboardStateManager.appState = newAppState;
  dashboardStateManager.uiState = newAppState.makeStateful('uiState');
}
