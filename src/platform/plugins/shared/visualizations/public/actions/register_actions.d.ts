import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { TypesStart } from '../vis_types/types_service';
export declare function registerActions(uiActions: UiActionsStart, data: DataPublicPluginStart, types: TypesStart): void;
