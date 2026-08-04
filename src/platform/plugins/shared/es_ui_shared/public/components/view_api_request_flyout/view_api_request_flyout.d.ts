import React from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';
import type { UrlService } from '@kbn/share-plugin/common/url_service';
import type { ApplicationStart } from '@kbn/core/public';
type FlyoutProps = Omit<EuiFlyoutProps, 'onClose'>;
interface ViewApiRequestFlyoutProps {
    title: string;
    description: string;
    request: string;
    closeFlyout: () => void;
    flyoutProps?: FlyoutProps;
    application?: ApplicationStart;
    urlService?: UrlService;
}
export declare const ApiRequestFlyout: React.FunctionComponent<ViewApiRequestFlyoutProps>;
export declare const ViewApiRequestFlyout: (props: ViewApiRequestFlyoutProps) => React.JSX.Element;
export {};
