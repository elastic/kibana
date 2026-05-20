import { type DashboardState } from '../../../common';
import type { DashboardChildState, DashboardLayout } from './types';
export declare function serializeLayout(layout: DashboardLayout, childState: DashboardChildState): Pick<DashboardState, 'panels' | 'pinned_panels'>;
