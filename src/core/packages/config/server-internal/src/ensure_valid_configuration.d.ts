import type { IConfigService, ConfigValidateParameters } from '@kbn/config';
/**
 * Parameters for the helper {@link ensureValidConfiguration}
 *
 * @internal
 */
export interface EnsureValidConfigurationParameters extends ConfigValidateParameters {
    /**
     * Set to `true` to ignore any unknown keys and discard them from the final validated config object.
     */
    stripUnknownKeys?: boolean;
}
/**
 * Validate the entire Kibana configuration object, including the detection of extra keys.
 * @param configService The {@link IConfigService} instance that has the raw configuration preloaded.
 * @param params {@link EnsureValidConfigurationParameters | Options} to enable/disable extra edge-cases.
 *
 * @internal
 */
export declare function ensureValidConfiguration(configService: IConfigService, params?: EnsureValidConfigurationParameters): Promise<void>;
