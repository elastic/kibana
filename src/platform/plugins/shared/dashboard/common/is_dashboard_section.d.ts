import type { DashboardPanel, DashboardSection, DashboardPinnedPanel } from '../server';
/**
 * Type guard that checks if a widget is a {@link DashboardSection}.
 *
 * @param widget - The widget to check, which can be either a {@link DashboardPanel} or {@link DashboardSection}.
 * @returns `true` if the widget is a {@link DashboardSection}, `false` otherwise.
 */
export declare const isDashboardSection: (widget: DashboardPanel | DashboardSection | DashboardPinnedPanel) => widget is DashboardSection;
