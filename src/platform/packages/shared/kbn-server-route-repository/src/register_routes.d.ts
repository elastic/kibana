import type { CoreSetup } from '@kbn/core-lifecycle-server';
import type { Logger } from '@kbn/logging';
import type { RouteParamsRT, ServerRoute } from '@kbn/server-route-repository-utils';
export declare function registerRoutes<TDependencies extends Record<string, any>>({ core, repository, logger, dependencies, runDevModeChecks, }: {
    core: CoreSetup;
    repository: Record<string, ServerRoute<string, RouteParamsRT | undefined, any, any, any>>;
    logger: Logger;
    dependencies: TDependencies;
    runDevModeChecks: boolean;
}): void;
