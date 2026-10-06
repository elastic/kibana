import type { PublishingSubject } from '../publishing_subject';
/**
 * An interface which determines whether the hover actions are overridden by the embeddable
 */
export interface CanOverrideHoverActions {
    overrideHoverActions$: PublishingSubject<boolean>;
    OverriddenHoverActionsComponent: React.ComponentType;
}
/**
 * A type guard which determines whether or not a given API overrides the hover actions.
 */
export declare const canOverrideHoverActions: (unknownApi: unknown) => unknownApi is CanOverrideHoverActions;
