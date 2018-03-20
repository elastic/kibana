export function isDefaultValue(item) {
  return (item.isCustom || item.value === undefined || item.value === '' || String(item.value) === String(item.defVal));
}
