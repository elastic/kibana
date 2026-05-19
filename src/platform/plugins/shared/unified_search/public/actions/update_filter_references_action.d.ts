import type { ActionExecutionMeta, UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { FilterManager } from '@kbn/data-plugin/public';
export interface UpdateFilterReferencesActionContext extends ActionExecutionMeta {
    /** The initial data view of the editable layer **/
    fromDataView: string;
    /** New data view of the editable layer
     *  @description undefined - in case of removing the layer
     */
    toDataView?: string | undefined;
    /** List of all Data Views used in all layers **/
    usedDataViews: string[] | [];
    /** Index to use by default if all layers are cleared **/
    defaultDataView?: string;
}
export declare function createUpdateFilterReferencesAction(filterManager: FilterManager): UiActionsActionDefinition<UpdateFilterReferencesActionContext>;
