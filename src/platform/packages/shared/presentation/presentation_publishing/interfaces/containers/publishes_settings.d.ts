import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesSettings {
    settings: Record<string, PublishingSubject<boolean | undefined>>;
}
export declare const apiPublishesSettings: (unknownApi: null | unknown) => unknownApi is PublishesSettings;
