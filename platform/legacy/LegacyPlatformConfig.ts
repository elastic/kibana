import { RawConfig } from '../config/RawConfigService';
import { ConfigPath } from '../config/ConfigService';

/**
 * Represents legacy Kibana config class.
 * @internal
 */
export interface LegacyConfig {
  get: (configPath: string) => any;
  set: (configPath: string, configValue: any) => void;
  has: (configPath: string) => boolean;
}

/**
 * Represents logging config supported by the legacy platform.
 */
interface LegacyLoggingConfig {
  silent: boolean;
  verbose: boolean;
  quiet: boolean;
  dest: string;
  json: boolean;
}

/**
 * Represents adapter between config provided by legacy platform and `RawConfig`
 * supported by the current platform.
 */
export class LegacyConfigToRawConfigAdapter implements RawConfig {
  constructor(private readonly legacyConfig: LegacyConfig) {}

  has(configPath: ConfigPath) {
    return this.legacyConfig.has(
      LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath)
    );
  }

  get(configPath: ConfigPath) {
    configPath = LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath);

    if (
      configPath.startsWith('__newPlatform') &&
      !this.legacyConfig.has(configPath)
    ) {
      // Whenever we handle a config for the new platform and it isn't defined
      // in the current platform, we want the new platform to handle the missing
      // config value, e.g. by applying defaults.
      //
      // NB! Note that you might need to update the Kibana schema if the `has`
      // check is failing for something that is present in the config, as the
      // `has` check depends on the schema itself in the current platform.
      return undefined;
    }

    const configValue = this.legacyConfig.get(configPath);

    switch (configPath) {
      case 'logging':
        return LegacyConfigToRawConfigAdapter.transformLogging(configValue);
      case 'server':
        return LegacyConfigToRawConfigAdapter.transformServer(configValue);
      default:
        return configValue;
    }
  }

  set(configPath: ConfigPath, value: any) {
    this.legacyConfig.set(
      LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath),
      value
    );
  }

  getFlattenedPaths() {
    // This method is only used to detect unused config paths, but when we
    // run new platform within the legacy one then the legacy platform is in
    // charge of this check.
    return [];
  }

  private static flattenConfigPath(configPath: ConfigPath) {
    if (!Array.isArray(configPath)) {
      return configPath;
    }

    return configPath.join('.');
  }

  private static transformLogging(configValue: LegacyLoggingConfig) {
    const loggingConfig = {
      root: { level: 'info' },
      appenders: { default: { kind: 'legacy-appender' } }
    };

    if (configValue.silent) {
      loggingConfig.root.level = 'off';
    } else if (configValue.quiet) {
      loggingConfig.root.level = 'error';
    } else if (configValue.verbose) {
      loggingConfig.root.level = 'all';
    }

    return loggingConfig;
  }

  private static transformServer(configValue: any) {
    // TODO: New platform uses just a subset of `server` config from the legacy platform,
    // new values will be exposed once we need them (eg. customResponseHeaders, cors or xsrf).
    return {
      host: configValue.host,
      port: configValue.port,
      maxPayload: configValue.maxPayloadBytes,
      basePath: configValue.basePath,
      ssl: configValue.ssl
    };
  }
}
