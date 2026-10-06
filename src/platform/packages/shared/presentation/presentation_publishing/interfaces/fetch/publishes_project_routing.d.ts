import type { ProjectRouting } from '@kbn/es-query';
import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesProjectRouting {
    projectRouting$: PublishingSubject<ProjectRouting | undefined>;
}
export declare const apiPublishesProjectRouting: (unknownApi: unknown) => unknownApi is PublishesProjectRouting;
export type ProjectRoutingOverrides = {
    name?: string;
    value: string;
}[] | undefined;
export interface PublishesProjectRoutingOverrides {
    projectRoutingOverrides$: PublishingSubject<ProjectRoutingOverrides>;
}
export declare const apiPublishesProjectRoutingOverrides: (unknownApi: unknown) => unknownApi is PublishesProjectRoutingOverrides;
