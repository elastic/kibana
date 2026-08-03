import React from 'react';
import type { monaco } from '@kbn/code-editor';
import type { ISearchGeneric } from '@kbn/search-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
interface IdentifierControlFormProps {
    search: ISearchGeneric;
    variableType: ESQLVariableType;
    variableName: string;
    queryString: string;
    esqlVariables: ESQLControlVariable[];
    setControlState: (state: OptionsListESQLControlState) => void;
    cursorPosition?: monaco.Position;
    initialState?: OptionsListESQLControlState;
    currentApp?: string;
}
export declare function IdentifierControlForm({ variableType, variableName, initialState, queryString, cursorPosition, esqlVariables, currentApp, setControlState, search, }: IdentifierControlFormProps): React.JSX.Element;
export {};
