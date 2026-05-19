import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ReactElement } from 'react';
import type { ProfileProviderServices } from '../../profile_provider_services';
export interface EnhancedAlertFlyoutHeaderProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
    refreshData?: () => void;
    fallbackRenderHeader?: (props: DocViewRenderProps) => ReactElement | undefined;
}
export declare const EnhancedAlertFlyoutHeader: ({ hit, providerServices, refreshData, fallbackRenderHeader, ...docViewProps }: EnhancedAlertFlyoutHeaderProps) => JSX.Element | null;
