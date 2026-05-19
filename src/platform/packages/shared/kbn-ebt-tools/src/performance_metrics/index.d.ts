import React from 'react';
export { usePerformanceContext } from './context/use_performance_context';
export { perfomanceMarkers } from './performance_markers';
export { usePageReady } from './context/use_page_ready';
export { type Meta } from './context/performance_context';
export declare const PerformanceContextProvider: React.ForwardRefExoticComponent<{
    children: React.ReactElement;
} & React.RefAttributes<{}>>;
