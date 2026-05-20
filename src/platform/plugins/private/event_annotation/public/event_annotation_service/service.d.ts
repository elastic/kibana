import type { CoreStart } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { type EventAnnotationServiceType } from '@kbn/event-annotation-components';
export declare function hasIcon(icon: string | undefined): icon is string;
export declare function getEventAnnotationService(core: CoreStart, contentManagement: ContentManagementPublicStart): EventAnnotationServiceType;
