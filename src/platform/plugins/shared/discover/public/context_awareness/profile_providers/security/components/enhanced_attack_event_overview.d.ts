import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ProfileProviderServices } from '../../profile_provider_services';
export interface EnhancedAttackEventOverviewProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
    refreshData?: () => void;
}
export declare const EnhancedAttackEventOverview: ({ hit, providerServices, refreshData, ...docViewProps }: EnhancedAttackEventOverviewProps) => JSX.Element | null;
