export function formatKey(key, series) {
  if (/{{\s*key\s*}}/.test(series.label)) {
    return series.label.replace(/{{\s*key\s*}}/, key);
  }
  return key;
}
