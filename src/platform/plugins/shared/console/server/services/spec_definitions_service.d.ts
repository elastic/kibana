import type { EndpointDescription, EndpointsAvailability } from '../../common/types';
export interface SpecDefinitionsDependencies {
    endpointsAvailability: EndpointsAvailability;
}
export declare class SpecDefinitionsService {
    private readonly name;
    private readonly globalRules;
    private readonly endpoints;
    private hasLoadedDefinitions;
    addGlobalAutocompleteRules(parentNode: string, rules: unknown): void;
    addEndpointDescription(endpoint: string, description?: EndpointDescription, isServerless?: boolean): void;
    asJson(): {
        name: string;
        globals: Record<string, any>;
        endpoints: Record<string, EndpointDescription>;
    };
    start({ endpointsAvailability }: SpecDefinitionsDependencies): void;
    private loadJSONDefinitionsFiles;
    private addToJsonDefinitions;
    private loadJsonDefinitions;
    private loadJSDefinitions;
}
