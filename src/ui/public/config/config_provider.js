export function ConfigProvider(config) {
  return {
    getConfig: (key, defaultValue) => {
      return config.get(key, defaultValue);
    }
  };
}
