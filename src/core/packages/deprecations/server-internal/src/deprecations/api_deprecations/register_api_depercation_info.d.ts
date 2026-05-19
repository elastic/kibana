import type { DeprecationsDetails } from '@kbn/core-deprecations-common';
import type { ApiDeprecationsServiceDeps } from './types';
export declare const createGetApiDeprecations: ({ http, coreUsageData, docLinks, }: Pick<ApiDeprecationsServiceDeps, "coreUsageData" | "http" | "docLinks">) => () => Promise<DeprecationsDetails[]>;
export declare const registerApiDeprecationsInfo: ({ deprecationsFactory, http, coreUsageData, docLinks, }: ApiDeprecationsServiceDeps) => void;
