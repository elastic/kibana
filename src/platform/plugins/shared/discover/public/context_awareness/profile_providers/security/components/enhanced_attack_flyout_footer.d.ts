import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ReactElement } from 'react';
import type { ProfileProviderServices } from '../../profile_provider_services';
export interface EnhancedAttackFlyoutFooterProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
    refreshData?: () => void;
    fallbackRenderFooter?: (props: DocViewRenderProps) => ReactElement | undefined;
}
export declare const EnhancedAttackFlyoutFooter: ({ hit, providerServices, refreshData, fallbackRenderFooter, ...docViewProps }: EnhancedAttackFlyoutFooterProps) => JSX.Element | null;
