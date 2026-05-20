import React from 'react';
import { type IShareContext } from '../../context';
import type { EmbedShareConfig, EmbedShareUIConfig } from '../../../types';
type EmbedProps = Pick<IShareContext, 'shareableUrlLocatorParams' | 'shareableUrlForSavedObject' | 'shareableUrl' | 'objectType' | 'isDirty' | 'allowShortUrl'> & EmbedShareConfig['config'] & {
    objectConfig?: EmbedShareUIConfig;
};
export declare const EmbedContent: ({ shareableUrlForSavedObject, shareableUrl, shareableUrlLocatorParams, objectType, objectConfig, isDirty, allowShortUrl, shortUrlService, anonymousAccess, }: EmbedProps) => React.JSX.Element;
export {};
