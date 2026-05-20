import { SharedComponent } from './components';
import type { AutocompleteComponent } from './components/autocomplete_component';
interface ParametrizedComponentFactories {
    getComponent: (value: string, isValue?: boolean) => ((value: string, parent: SharedComponent | undefined, template?: unknown) => SharedComponent) | undefined;
}
export declare function globalsOnlyAutocompleteComponents(): AutocompleteComponent[];
/**
 * @param endpointId id of the endpoint being compiled.
 * @param description a json dict describing the endpoint
 * @param endpointComponentResolver a function (endpoint,context,editor) which should resolve an endpoint
 *        to it's list of compiled components.
 * @param parametrizedComponentFactories a dict of the following structure
 * that will be used as a fall back for pattern keys (i.e.: {index}, resolved without the {})
 * {
 *   TYPE: function (part, parent, endpoint) {
 *      return new SharedComponent(part, parent)
 *   }
 * }
 */
export declare function compileBodyDescription(endpointId: string, description: unknown, parametrizedComponentFactories: ParametrizedComponentFactories): AutocompleteComponent[];
export {};
