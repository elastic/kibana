import type React from 'react';
import type { AppHeaderBack } from '../../types';
export interface BackNavigation {
    backHref: string;
    backOnClick?: React.MouseEventHandler;
    backDestinationLabel?: string;
}
export declare function useBackNavTargets(back: AppHeaderBack | AppHeaderBack[] | undefined): BackNavigation[];
