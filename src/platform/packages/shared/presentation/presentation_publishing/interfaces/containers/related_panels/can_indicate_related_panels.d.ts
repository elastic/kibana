import type { BehaviorSubject } from 'rxjs';
import type { PublishesRelatedPanels } from '../../publishes_related_panels';
/**
 * This API can indicate panels related to a certain child panel. Consumers determine
 * relatedness by subscribing to the rendered child's own `relatedPanels$` (auto-published
 * on every embeddable) and checking whether the indicated id is in the list.
 *
 * We are calling this "indicating" because "highlight" refers to something else and
 * "callout" is a kind of EUI element and naming things is the second hardest problem in
 * computer science.
 */
export interface CanIndicateRelatedChildren {
    setRelatedPanelsIndicatorId: (panelId?: string) => void;
    relatedPanelsIndicatorId$: BehaviorSubject<string | undefined>;
}
/**
 * A type guard which can be used to determine if a given API can indicate panels related to a certain child panel
 */
export declare const apiCanIndicateRelatedChildren: (api: unknown) => api is CanIndicateRelatedChildren;
/**
 * This API is capable of indicating its related siblings. Used to enable a user action to set this particular panel
 * as the relatedPanelsIndicatorId in a CanIndicateRelatedChildren
 */
export type CanIndicateRelatedSiblings = PublishesRelatedPanels & {
    canIndicateRelatedSiblings: boolean;
};
export declare const apiCanIndicateRelatedSiblings: (unknownApi: unknown | null) => unknownApi is CanIndicateRelatedSiblings;
