import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ReactElement } from 'react';
import type { ProfileProviderServices } from '../../profile_provider_services';
export interface EnhancedIOCFlyoutHeaderProps extends DocViewRenderProps {
    providerServices: ProfileProviderServices;
    fallbackRenderHeader?: (props: DocViewRenderProps) => ReactElement | undefined;
}
export declare const EnhancedIOCFlyoutHeader: ({ hit, providerServices, fallbackRenderHeader, ...docViewProps }: EnhancedIOCFlyoutHeaderProps) => JSX.Element | null;
