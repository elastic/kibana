import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ReactElement } from 'react';
import type { ProfileProviderServices } from '../../profile_provider_services';
export interface EnhancedAlertFlyoutFooterProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
    refreshData?: () => void;
    fallbackRenderFooter?: (props: DocViewRenderProps) => ReactElement | undefined;
}
export declare const EnhancedAlertFlyoutFooter: ({ hit, providerServices, refreshData, fallbackRenderFooter, ...docViewProps }: EnhancedAlertFlyoutFooterProps) => JSX.Element | null;
