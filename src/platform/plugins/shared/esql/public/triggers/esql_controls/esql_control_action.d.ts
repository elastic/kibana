import { type Action } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { ESQLVariableType, type ESQLControlVariable, type ControlTriggerSource } from '@kbn/esql-types';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { monaco } from '@kbn/code-editor';
export declare function isActionCompatible(core: CoreStart, variableType: ESQLVariableType): any;
interface Context {
    queryString: string;
    variableType: ESQLVariableType;
    esqlVariables: ESQLControlVariable[];
    onSaveControl?: (controlState: OptionsListESQLControlState, updatedQuery: string) => Promise<void>;
    onCancelControl?: () => void;
    cursorPosition?: monaco.Position;
    initialState?: OptionsListESQLControlState;
    parentApi?: unknown;
    triggerSource?: ControlTriggerSource;
    controlId?: string;
}
export declare class CreateESQLControlAction implements Action<Context> {
    protected readonly core: CoreStart;
    protected readonly search: ISearchGeneric;
    protected readonly timefilter: TimefilterContract;
    type: string;
    id: string;
    order: number;
    constructor(core: CoreStart, search: ISearchGeneric, timefilter: TimefilterContract);
    getDisplayName(): string;
    getIconType(): string;
    isCompatible({ variableType }: Context): Promise<any>;
    execute({ queryString, variableType, esqlVariables, onSaveControl, onCancelControl, cursorPosition, initialState, parentApi, triggerSource, controlId, }: Context): Promise<void>;
}
export {};
