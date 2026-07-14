import type { CliArgs } from '@kbn/config';
interface BootstrapArgs {
    configs: string[];
    cliArgs: CliArgs;
    applyConfigOverrides: (config: Record<string, any>) => Record<string, any>;
}
/**
 *
 * @internal
 * @param param0 - options
 */
export declare function bootstrap({ configs, cliArgs, applyConfigOverrides }: BootstrapArgs): Promise<void>;
export {};
