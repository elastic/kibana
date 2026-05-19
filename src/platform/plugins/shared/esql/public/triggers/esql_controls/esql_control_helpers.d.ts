import React from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ISearchGeneric } from '@kbn/search-types';
import { type ESQLControlVariable, type ESQLVariableType, type ControlTriggerSource } from '@kbn/esql-types';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { monaco } from '@kbn/code-editor';
import type { ESQLEditorTelemetryService } from '@kbn/esql-editor';
interface Context {
    queryString: string;
    core: CoreStart;
    search: ISearchGeneric;
    timefilter: TimefilterContract;
    variableType: ESQLVariableType;
    esqlVariables: ESQLControlVariable[];
    onSaveControl?: (controlState: OptionsListESQLControlState, updatedQuery: string) => Promise<void>;
    onCancelControl?: () => void;
    cursorPosition?: monaco.Position;
    initialState?: OptionsListESQLControlState;
    closeFlyout?: () => void;
    ariaLabelledBy: string;
    currentApp?: string;
    triggerSource?: ControlTriggerSource;
    telemetryService: ESQLEditorTelemetryService;
}
export declare function loadESQLControlFlyout({ queryString, core, search, timefilter, variableType, esqlVariables, onSaveControl, onCancelControl, cursorPosition, initialState, closeFlyout, ariaLabelledBy, currentApp, triggerSource, telemetryService, }: Context): Promise<React.JSX.Element>;
export {};
