import type { DashboardSection, DashboardPanel } from '../server';
/**
 * Type guard that checks if a widget is a {@link DashboardPanel}.
 *
 * @param widget - The widget to check, which can be either a {@link DashboardPanel} or {@link DashboardSection}.
 * @returns `true` if the widget is a {@link DashboardPanel}, `false` otherwise.
 */
export declare const isDashboardPanel: (widget: DashboardPanel | DashboardSection) => widget is DashboardPanel;
