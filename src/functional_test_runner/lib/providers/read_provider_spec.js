export function readProviderSpec(type, providers) {
  return Object.keys(providers).map(name => {
    return {
      type,
      name,
      fn: providers[name],
    };
  });
}
