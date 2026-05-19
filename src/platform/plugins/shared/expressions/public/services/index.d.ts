import type { NotificationsStart } from '@kbn/core/public';
import type { ExpressionsService, ExpressionRendererRegistry } from '../../common';
export declare const getNotifications: import("@kbn/kibana-utils-plugin/public").Get<NotificationsStart>, setNotifications: import("@kbn/kibana-utils-plugin/public").Set<NotificationsStart>;
export declare const getRenderersRegistry: import("@kbn/kibana-utils-plugin/public").Get<ExpressionRendererRegistry>, setRenderersRegistry: import("@kbn/kibana-utils-plugin/public").Set<ExpressionRendererRegistry>;
export declare const getExpressionsService: import("@kbn/kibana-utils-plugin/public").Get<ExpressionsService>, setExpressionsService: import("@kbn/kibana-utils-plugin/public").Set<ExpressionsService>;
export * from './expressions_services';
