import React from 'react';
import type { DashboardRendererProps } from './dashboard_renderer';
/**
 * A lazy-loaded wrapper component for the {@link DashboardRenderer}.
 * This component dynamically imports the dashboard renderer to reduce initial bundle size.
 *
 * @param props - The {@link DashboardRendererProps} to pass to the dashboard renderer.
 * @returns A React element containing the lazy-loaded dashboard renderer.
 */
export declare function LazyDashboardRenderer(props: DashboardRendererProps): React.JSX.Element;
