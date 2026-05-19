import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { InternalDeprecationRouter } from '../internal_types';
export declare const registerMarkAsResolvedRoute: (router: InternalDeprecationRouter, { coreUsageData }: {
    coreUsageData: InternalCoreUsageDataSetup;
}) => void;
