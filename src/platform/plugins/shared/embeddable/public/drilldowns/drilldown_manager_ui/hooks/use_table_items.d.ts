import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { DrilldownActionState } from '../../types';
import type { DrilldownsManagerDeps } from '../state';
export declare const useTableItems: (drilldowns$: PublishingSubject<DrilldownActionState[]>, factories: DrilldownsManagerDeps["factories"], getTrigger: DrilldownsManagerDeps["getTrigger"], triggers: DrilldownsManagerDeps["triggers"]) => {
    id: string;
    drilldownName: string;
    actionName: string;
    icon: string | undefined;
    error: string | undefined;
    trigger: import("../../../../../ui_actions/public").Trigger;
    triggerIncompatible: boolean;
}[];
