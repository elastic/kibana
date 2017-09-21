import { Observable } from 'rxjs/Observable';

const configProperty = Symbol('legacy-config');

const transformLogging = (configValue: any) => {
  // Use default `logging` config for now.
  return {};
};

const transformXPack = (configValue: any) => {
  // No `xpack` config support for now.
  return {};
};

const transformPid = (configValue: any) => {
  // Currently pid plugin always expects non-empty pid file path if plugin is not disabled.
  // TODO: Should be fixed in Pid plugin.
  if (!configValue.file) {
    return { enabled: false };
  }

  return configValue;
};

const transformServer = (configValue: any) => {
  // TODO: New platform doesn't support too many fields right now, we should fix it.
  return {
    host: configValue.host,
    port: configValue.port,
    maxPayload: `${configValue.maxPayloadBytes || 0}b`,
    basePath: configValue.basePath,
    ssl: configValue.ssl
  };
};

const configProxyHandler = {
  get(target: any, configKey: string): any {
    const config = target[configProperty];
    if (!config.has(configKey)) {
      return undefined;
    }

    const configValue = config.get(configKey);

    if (configKey === 'logging') {
      return transformLogging(configValue);
    }

    if (configKey === 'xpack') {
      return transformXPack(configValue);
    }

    if (configKey === 'pid') {
      return transformPid(configValue);
    }

    if (configKey === 'server') {
      return transformServer(configValue);
    }

    return configValue;
  }
};

export const getLegacyConfig$ = (kbnServer: any) => {
  return Observable.from([
    new Proxy({ [configProperty]: kbnServer.config }, configProxyHandler)
  ]);
};
