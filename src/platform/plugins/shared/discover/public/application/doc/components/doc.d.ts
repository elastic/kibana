import React from 'react';
import type { EsDocSearchProps } from '@kbn/unified-doc-viewer-plugin/public/types';
export interface DocProps extends EsDocSearchProps {
    /**
     * Discover main view url
     */
    referrer?: string;
}
export declare function Doc(props: DocProps): React.JSX.Element;
