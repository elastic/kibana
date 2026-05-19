import type { TimeRange } from '@kbn/es-query';
import { ESQLVariableType, EsqlControlType, type ESQLControlVariable } from '@kbn/esql-types';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ISearchGeneric } from '@kbn/search-types';
import React from 'react';
interface ValueControlFormProps {
    search: ISearchGeneric;
    variableType: ESQLVariableType;
    variableName: string;
    controlFlyoutType: EsqlControlType;
    queryString: string;
    setControlState: (state: OptionsListESQLControlState) => void;
    setIsValid: (isValid: boolean) => void;
    initialState?: OptionsListESQLControlState;
    valuesRetrieval?: string;
    timeRange?: TimeRange;
    esqlVariables: ESQLControlVariable[];
}
export declare function ValueControlForm({ variableType, initialState, queryString, variableName, controlFlyoutType, search, setControlState, setIsValid, valuesRetrieval, timeRange, esqlVariables, }: ValueControlFormProps): React.JSX.Element;
export {};
