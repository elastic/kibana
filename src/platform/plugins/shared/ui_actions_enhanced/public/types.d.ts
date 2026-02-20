import type { KibanaReactOverlays } from '@kbn/kibana-react-plugin/public';
import type { ActionFactory } from './dynamic_actions';
export interface CommonlyUsedRange {
    from: string;
    to: string;
    display: string;
}
export type OpenModal = KibanaReactOverlays['openModal'];
export type ActionFactoryRegistry = Map<string, ActionFactory>;
