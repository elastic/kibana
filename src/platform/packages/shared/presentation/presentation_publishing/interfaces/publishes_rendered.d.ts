import type { PublishingSubject } from '../publishing_subject';
export interface PublishesRendered {
    rendered$: PublishingSubject<boolean>;
    renderCount$?: PublishingSubject<number>;
}
export declare const apiPublishesRendered: (unknownApi: null | unknown) => unknownApi is PublishesRendered;
