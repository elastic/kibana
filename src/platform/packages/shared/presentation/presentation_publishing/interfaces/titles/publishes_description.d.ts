import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesDescription {
    description$: PublishingSubject<string | undefined>;
    defaultDescription$?: PublishingSubject<string | undefined>;
}
export declare function getDescription(api: Partial<PublishesDescription>): string | undefined;
export type PublishesWritableDescription = PublishesDescription & {
    setDescription: (newTitle: string | undefined) => void;
};
export declare const apiPublishesDescription: (unknownApi: null | unknown) => unknownApi is PublishesDescription;
export declare const apiPublishesWritableDescription: (unknownApi: null | unknown) => unknownApi is PublishesWritableDescription;
