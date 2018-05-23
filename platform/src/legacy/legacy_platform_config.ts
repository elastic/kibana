import {
  NEW_PLATFORM_CONFIG_ROOT,
  ObjectToRawConfigAdapter,
  RawConfig,
} from '../config';
import { ConfigPath } from '../config/config_service';

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
  private newPlatformConfig: ObjectToRawConfigAdapter;

  constructor(private readonly legacyConfig: LegacyConfig) {
    this.newPlatformConfig = new ObjectToRawConfigAdapter({
      [NEW_PLATFORM_CONFIG_ROOT]:
        legacyConfig.get(NEW_PLATFORM_CONFIG_ROOT) || {},
    });
  }

  has(configPath: ConfigPath) {
    if (LegacyConfigToRawConfigAdapter.isNewPlatformConfig(configPath)) {
      return this.newPlatformConfig.has(configPath);
    }

    return this.legacyConfig.has(
      LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath)
    );
  }

  get(configPath: ConfigPath) {
    if (LegacyConfigToRawConfigAdapter.isNewPlatformConfig(configPath)) {
      return this.newPlatformConfig.get(configPath);
    }

    configPath = LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath);

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
    if (LegacyConfigToRawConfigAdapter.isNewPlatformConfig(configPath)) {
      return this.newPlatformConfig.set(configPath, value);
    }

    this.legacyConfig.set(
      LegacyConfigToRawConfigAdapter.flattenConfigPath(configPath),
      value
    );
  }

  getFlattenedPaths() {
    // This method is only used to detect unused config paths, but when we run
    // new platform within the legacy one then the new platform is in charge of
    // only `__newPlatform` config node and the legacy platform will check the rest.
    return this.newPlatformConfig.getFlattenedPaths();
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
      appenders: { default: { kind: 'legacy-appender' } },
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
      cors: configValue.cors,
      maxPayload: configValue.maxPayloadBytes,
      basePath: configValue.basePath,
      rewriteBasePath: configValue.rewriteBasePath,
      ssl: configValue.ssl,
    };
  }

  private static isNewPlatformConfig(configPath: ConfigPath) {
    if (Array.isArray(configPath)) {
      return configPath[0] === NEW_PLATFORM_CONFIG_ROOT;
    }

    return configPath.startsWith(NEW_PLATFORM_CONFIG_ROOT);
  }
}
