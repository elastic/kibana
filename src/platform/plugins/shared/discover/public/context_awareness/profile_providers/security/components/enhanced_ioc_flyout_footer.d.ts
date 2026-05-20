import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ReactElement } from 'react';
import type { ProfileProviderServices } from '../../profile_provider_services';
export interface EnhancedIOCFlyoutFooterProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
    fallbackRenderFooter?: (props: DocViewRenderProps) => ReactElement | undefined;
}
export declare const EnhancedIOCFlyoutFooter: ({ hit, providerServices, fallbackRenderFooter, ...docViewProps }: EnhancedIOCFlyoutFooterProps) => JSX.Element | null;
