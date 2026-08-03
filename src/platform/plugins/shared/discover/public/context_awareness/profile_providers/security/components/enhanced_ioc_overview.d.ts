import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ProfileProviderServices } from '../../profile_provider_services';
export interface EnhancedIOCOverviewProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
}
export declare const EnhancedIOCOverview: ({ hit, providerServices, ...docViewProps }: EnhancedIOCOverviewProps) => JSX.Element | null;
