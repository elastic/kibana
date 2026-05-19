import type { ESQLControlVariable } from '@kbn/esql-types';
/**
 * Service to manage ESQL variables for controls
 * The service allows adding, retrieving and clearing variables
 * and enables/disables the creation of control suggestions based on variables.
 */
export declare class EsqlVariablesService {
    esqlVariables: ESQLControlVariable[];
    isCreateControlSuggestionEnabled: boolean;
    enableCreateControlSuggestion(): void;
    disableCreateControlSuggestion(): void;
    addVariable(variable: ESQLControlVariable): void;
    clearVariables(): void;
}
