import { transformDeprecations, Config } from '../config';

async function defaultConfig(settings) {
  return await Config.withDefaultSchema(
    transformDeprecations(settings)
  );
}

export async function getNativeControllerConfig(settings, specConfig) {
  const config = await defaultConfig(settings);

  return specConfig.reduce((acc, key) => {
    acc[key] = config.get(key);
    return acc;
  }, {});
}
