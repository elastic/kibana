import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesApproximation {
    isApproximate$: PublishingSubject<boolean>;
}
export declare const apiPublishesApproximation: (unknownApi: unknown) => unknownApi is PublishesApproximation;
