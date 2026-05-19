import type { ApiDeprecationDetails, DomainDeprecationDetails } from '@kbn/core-deprecations-common';
import type { PostValidationMetadata } from '@kbn/core-http-server';
import type { BuildApiDeprecationDetailsParams } from '../types';
export declare const getIsAccessApiDeprecation: ({ isInternalApiRequest, isPublicAccess, }: PostValidationMetadata) => boolean;
export declare const buildApiAccessDeprecationDetails: ({ apiUsageStats, deprecatedApiDetails, docLinks, }: BuildApiDeprecationDetailsParams) => DomainDeprecationDetails<ApiDeprecationDetails>;
