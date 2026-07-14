import type { EnvironmentMode, PackageInfo } from '@kbn/config';
import type { LoggerFactory } from '@kbn/logging';
import type { CoreId } from '@kbn/core-base-common-internal';
/** @internal */
export interface CoreContext {
    coreId: CoreId;
    logger: LoggerFactory;
    env: CoreEnv;
}
/** @internal */
export interface CoreEnv {
    mode: Readonly<EnvironmentMode>;
    packageInfo: Readonly<PackageInfo>;
    airgapped: boolean;
    isCoreRenderingInReactConcurrentMode: boolean;
}
