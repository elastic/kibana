import type { ApiDeprecationDetails, DomainDeprecationDetails } from '@kbn/core-deprecations-common';
import type { PostValidationMetadata } from '@kbn/core-http-server';
import type { BuildApiDeprecationDetailsParams } from '../types';
export declare const getIsRouteApiDeprecation: ({ isInternalApiRequest, deprecated, }: PostValidationMetadata) => boolean;
export declare const buildApiRouteDeprecationDetails: ({ apiUsageStats, deprecatedApiDetails, docLinks, }: BuildApiDeprecationDetailsParams) => DomainDeprecationDetails<ApiDeprecationDetails>;
