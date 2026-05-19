import type { CoreStart } from '@kbn/core/public';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { FilterManager, TimefilterContract } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
export interface ApplyGlobalFilterActionContext {
    filters: Filter[];
    timeFieldName?: string;
    embeddable?: unknown;
    controlledBy?: string;
}
export declare function createFilterAction(filterManager: FilterManager, timeFilter: TimefilterContract, coreStart: CoreStart, id?: string, type?: string): UiActionsActionDefinition<ApplyGlobalFilterActionContext>;
