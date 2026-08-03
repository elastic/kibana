import React from 'react';
import type { Template } from '@kbn/workflows-library';
export interface SolutionFilterProps {
    /** The full catalog — used to populate the list of solutions present. */
    templates: Template[];
    value: string | undefined;
    onChange: (solution: string | undefined) => void;
    /** Disabled and pre-selected when an active solution nav is detected. */
    disabled?: boolean;
}
export declare const SolutionFilter: React.NamedExoticComponent<SolutionFilterProps>;
