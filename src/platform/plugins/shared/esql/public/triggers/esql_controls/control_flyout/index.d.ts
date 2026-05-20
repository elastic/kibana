import React from 'react';
import type { ESQLEditorTelemetryService } from '@kbn/esql-editor';
import type { TimeRange } from '@kbn/es-query';
import { ESQLVariableType, type ESQLControlVariable, type ControlTriggerSource } from '@kbn/esql-types';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ISearchGeneric } from '@kbn/search-types';
import type { monaco } from '@kbn/code-editor';
interface ESQLControlsFlyoutProps {
    search: ISearchGeneric;
    initialVariableType: ESQLVariableType;
    queryString: string;
    esqlVariables: ESQLControlVariable[];
    timeRange?: TimeRange;
    onSaveControl?: (controlState: OptionsListESQLControlState, updatedQuery: string) => Promise<void>;
    onCancelControl?: () => void;
    cursorPosition?: monaco.Position;
    initialState?: OptionsListESQLControlState;
    closeFlyout: () => void;
    ariaLabelledBy: string;
    currentApp?: string;
    telemetryTriggerSource?: ControlTriggerSource;
    telemetryService: ESQLEditorTelemetryService;
}
export declare function ESQLControlsFlyout({ search, initialVariableType, queryString, esqlVariables, timeRange, onSaveControl, onCancelControl, cursorPosition, initialState, closeFlyout, ariaLabelledBy, currentApp, telemetryTriggerSource, telemetryService, }: ESQLControlsFlyoutProps): React.JSX.Element;
export {};
