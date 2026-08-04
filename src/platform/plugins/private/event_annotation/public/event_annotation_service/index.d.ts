import type { CoreStart } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-components';
export type { EventAnnotationServiceType };
export declare class EventAnnotationService {
    private servicePromise?;
    private core;
    private contentManagement;
    constructor(core: CoreStart, contentManagement: ContentManagementPublicStart);
    getService(): Promise<EventAnnotationServiceType>;
}
