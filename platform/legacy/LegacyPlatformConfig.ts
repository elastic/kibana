import { Observable } from 'rxjs/Observable';

const configProperty = Symbol('legacy-config');

const configProxyHandler = {
  get(target: any, configKey: string): any {
    const config = target[configProperty];
    if (!config.has(configKey)) {
      return undefined;
    }

    // Use default `logging` config for now.
    if (configKey === 'logging') {
      return {};
    }

    // No `xpack` config support for now.
    if (configKey === 'xpack') {
      return {};
    }

    const configValue = config.get(configKey);

    // Currently pid plugin always expects non-empty pid file path if plugin is not disabled.
    // TODO: Should be fixed in Pid plugin.
    if (configKey === 'pid' && !configValue.file) {
      return { enabled: false };
    }

    // TODO: New platform doesn't support too many fields right now, we should fix it.
    if (configKey === 'server') {
      return {
        host: configValue.host,
        port: configValue.port,
        maxPayload: `${configValue.maxPayloadBytes || 0}b`,
        basePath: configValue.basePath,
        ssl: configValue.ssl
      };
    }

    if (configKey === 'elasticsearch') {
      const clusterTimeoutNames = [
        'shardTimeout',
        'requestTimeout',
        'pingTimeout',
        'startupTimeout'
      ];

      // Fix `duration` formats.
      clusterTimeoutNames.forEach(key => {
        if (key in configValue) {
          configValue[key] = `${configValue[key]}ms`;
        }

        if (key in configValue.tribe) {
          configValue.tribe[key] = `${configValue.tribe[key]}ms`;
        }
      });

      if (
        configValue.healthCheck &&
        typeof configValue.healthCheck.delay === 'number'
      ) {
        configValue.healthCheck.delay = `${configValue.healthCheck.delay}ms`;
      }

      // TODO: Review SSL config format and make it work.
      configValue.ssl = undefined;

      if (configValue.tribe) {
        configValue.tribe.ssl = undefined;
      }
    }

    return configValue;
  }
};

export const getLegacyConfig$ = (kbnServer: any) => {
  return Observable.from([
    new Proxy({ [configProperty]: kbnServer.config }, configProxyHandler)
  ]);
};
