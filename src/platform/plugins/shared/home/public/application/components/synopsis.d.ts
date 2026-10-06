import React from 'react';
import type { EuiCardProps, IconType } from '@elastic/eui';
export interface SynopsisProps {
    id: string;
    title: string;
    description: string;
    iconUrl?: string;
    iconType?: IconType;
    url?: string;
    isBeta?: boolean;
    onClick?: EuiCardProps['onClick'];
}
export declare function Synopsis({ id, description, iconUrl, iconType, title, url, onClick, isBeta, }: SynopsisProps): React.JSX.Element;
