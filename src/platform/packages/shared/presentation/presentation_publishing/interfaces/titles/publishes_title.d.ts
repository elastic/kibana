import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesTitle {
    title$: PublishingSubject<string | undefined>;
    hideTitle$: PublishingSubject<boolean | undefined>;
    defaultTitle$?: PublishingSubject<string | undefined>;
}
export declare function getTitle(api: Partial<PublishesTitle>): string | undefined;
export type PublishesWritableTitle = PublishesTitle & {
    setTitle: (newTitle: string | undefined) => void;
    setHideTitle: (hide: boolean | undefined) => void;
};
export declare const apiPublishesTitle: (unknownApi: null | unknown) => unknownApi is PublishesTitle;
export declare const apiPublishesWritableTitle: (unknownApi: null | unknown) => unknownApi is PublishesWritableTitle;
