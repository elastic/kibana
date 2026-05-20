import type { FunctionComponent } from 'react';
import type { ConsoleTourStepProps } from './console_tour_step';
export interface TopNavMenuItem {
    id: string;
    label: string;
    description: string;
    onClick: () => void;
    testId: string;
    isSelected: boolean;
    tourStep?: number;
}
interface Props {
    disabled?: boolean;
    items: TopNavMenuItem[];
    tourStepProps: ConsoleTourStepProps[];
}
export declare const TopNavMenu: FunctionComponent<Props>;
export {};
