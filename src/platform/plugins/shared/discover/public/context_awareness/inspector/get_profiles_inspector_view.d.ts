import type { Adapters, InspectorViewDescription } from '@kbn/inspector-plugin/public';
import type { ContextsAdapter } from '../hooks';
export interface InspectorAdapters extends Adapters {
    contexts?: ContextsAdapter;
}
export declare const getProfilesInspectorView: () => InspectorViewDescription;
