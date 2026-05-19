import type { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import type { getDashboardStateSchema, getPanelSchema, getSectionSchema, optionsSchema, panelGridSchema } from './dashboard_state_schemas';
import type { warningsSchema } from './warnings_schema';
export type Warnings = TypeOf<typeof warningsSchema>;
/** Display options for a dashboard. */
export type DashboardOptions = TypeOf<typeof optionsSchema>;
/** Grid position and size data for a panel. */
export type GridData = TypeOf<typeof panelGridSchema>;
/** A panel in a dashboard containing an embeddable visualization. */
export type DashboardPanel = TypeOf<ReturnType<typeof getPanelSchema>>;
/** A section in a dashboard that groups panels. */
export type DashboardSection = TypeOf<ReturnType<typeof getSectionSchema>>;
/** The complete state of a dashboard including panels, filters, and settings. */
export type DashboardState = Writable<TypeOf<ReturnType<typeof getDashboardStateSchema>>>;
export type DashboardPinnedPanelsState = NonNullable<DashboardState['pinned_panels']>;
export type DashboardPinnedPanel = DashboardPinnedPanelsState[number];
export type Operation = 'create' | 'read' | 'update' | 'search';
