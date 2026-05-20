import React from 'react';
import type { AppMountParameters } from '@kbn/core/public';
export interface VisualizeAppProps {
    onAppLeave: AppMountParameters['onAppLeave'];
}
export declare const VisualizeApp: ({ onAppLeave }: VisualizeAppProps) => React.JSX.Element;
