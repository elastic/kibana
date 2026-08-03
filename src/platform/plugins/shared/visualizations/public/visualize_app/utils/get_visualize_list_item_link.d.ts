import type { ApplicationStart } from '@kbn/core/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { VisualizeUserContent } from '../../utils/to_table_list_view_saved_object';
export declare const getVisualizeListItemLinkFn: (application: ApplicationStart, kbnUrlStateStorage: IKbnUrlStateStorage) => (item: VisualizeUserContent) => string | undefined;
