import React from 'react';
import { type IShareContext } from '../../context';
import type { LinkShareConfig, LinkShareUIConfig } from '../../../types';
type LinkProps = Pick<IShareContext, 'objectType' | 'objectId' | 'isDirty' | 'shareableUrl' | 'shareableUrlLocatorParams' | 'allowShortUrl'> & LinkShareConfig['config'] & {
    objectConfig?: LinkShareUIConfig;
};
export declare const LinkContent: ({ isDirty, objectType, objectConfig, shareableUrl, shortUrlService, shareableUrlLocatorParams, allowShortUrl, }: LinkProps) => React.JSX.Element;
export {};
