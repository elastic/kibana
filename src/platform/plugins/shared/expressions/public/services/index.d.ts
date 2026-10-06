import type { NotificationsStart } from '@kbn/core/public';
import type { ExpressionsService, ExpressionRendererRegistry } from '../../common';
export declare const getNotifications: import("@kbn/kibana-utils-plugin/common").Get<NotificationsStart>, setNotifications: import("@kbn/kibana-utils-plugin/common").Set<NotificationsStart>;
export declare const getRenderersRegistry: import("@kbn/kibana-utils-plugin/common").Get<ExpressionRendererRegistry>, setRenderersRegistry: import("@kbn/kibana-utils-plugin/common").Set<ExpressionRendererRegistry>;
export declare const getExpressionsService: import("@kbn/kibana-utils-plugin/common").Get<ExpressionsService>, setExpressionsService: import("@kbn/kibana-utils-plugin/common").Set<ExpressionsService>;
export * from './expressions_services';
