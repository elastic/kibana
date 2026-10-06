import type { App, CoreSetup } from '@kbn/core/public';
import type { ForwardDefinition, UrlForwardingStart } from '../plugin';
export declare const createLegacyUrlForwardApp: (core: CoreSetup<{}, UrlForwardingStart>, forwards: ForwardDefinition[]) => App;
