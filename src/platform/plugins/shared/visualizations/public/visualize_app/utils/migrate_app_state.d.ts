import type { VisualizeAppState } from '../types';
/**
 * Creates a new instance of AppState based on the table vis state.
 *
 * Dashboards have a similar implementation; see
 * src/plugins/dashboard/public/application/lib/migrate_app_state.ts
 *
 * @param appState {VisualizeAppState}
 */
export declare function migrateAppState(appState: VisualizeAppState): VisualizeAppState;
