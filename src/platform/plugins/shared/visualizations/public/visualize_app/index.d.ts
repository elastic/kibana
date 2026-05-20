import type { AppMountParameters } from '@kbn/core/public';
import type { VisualizeServices } from './types';
export declare const renderApp: ({ element, onAppLeave }: AppMountParameters, services: VisualizeServices) => () => boolean;
