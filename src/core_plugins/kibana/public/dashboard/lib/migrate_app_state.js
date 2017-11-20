/**
 * Creates a new instance of AppState based of the saved dashboard.
 *
 * @param appState {AppState} AppState class to instantiate
 */
export function migrateAppState(appState) {
  // For BWC in pre 6.1 versions where uiState was stored at the dashboard level, not at the panel level.
  if (appState.uiState) {
    appState.panels.forEach(panel => {
      panel.embeddableConfig = appState.uiState[`P-${panel.panelIndex}`];
    });
    delete appState.uiState;
    appState.save();
  }
}
