import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ProfileProviderServices } from '../../profile_provider_services';
/**
 * This component is a placeholder for the new alert/event Overview tab content.
 * It will be rendered only when the discover.securitySolutionFlyout feature flag is enabled.
 * The intention keep implementing its content as we're extracting flyout code from the Security Solution plugin to a set of package.
 * The feature flag will remain disabled until we're ready to ship some of the content. The target is to release an MVP by 9.4 then have it fully functional by 9.5.
 */
export interface EnhancedAlertEventOverviewProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
    refreshData?: () => void;
}
export declare const EnhancedAlertEventOverview: ({ hit, providerServices, refreshData, ...docViewProps }: EnhancedAlertEventOverviewProps) => JSX.Element | null;
