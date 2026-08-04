import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ReactElement } from 'react';
import type { ProfileProviderServices } from '../../profile_provider_services';
export interface EnhancedAttackFlyoutHeaderProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
    refreshData?: () => void;
    fallbackRenderHeader?: (props: DocViewRenderProps) => ReactElement | undefined;
}
export declare const EnhancedAttackFlyoutHeader: ({ hit, providerServices, refreshData, fallbackRenderHeader, ...docViewProps }: EnhancedAttackFlyoutHeaderProps) => JSX.Element | null;
