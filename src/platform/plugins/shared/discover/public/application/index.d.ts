import type { AppMountParameters } from '@kbn/core/public';
import type { DiscoverServices } from '../build_services';
import type { DiscoverCustomizationContext } from '../customizations';
export interface RenderAppProps {
    element: HTMLElement;
    onAppLeave: AppMountParameters['onAppLeave'];
    services: DiscoverServices;
    customizationContext: DiscoverCustomizationContext;
}
export declare const renderApp: ({ element, onAppLeave, services, customizationContext, }: RenderAppProps) => () => void;
