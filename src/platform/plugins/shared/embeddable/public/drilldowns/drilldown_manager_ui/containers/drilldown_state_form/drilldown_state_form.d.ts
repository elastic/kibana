import React from 'react';
import type { DrilldownManager } from '../../state';
export interface DrilldownStateFormProps {
    drilldown: DrilldownManager;
    disabled?: boolean;
}
export declare const DrilldownStateForm: React.FC<DrilldownStateFormProps>;
