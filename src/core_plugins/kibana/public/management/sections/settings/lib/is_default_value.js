export function isDefaultValue(setting) {
  return (setting.isCustom || setting.value === undefined || setting.value === '' || String(setting.value) === String(setting.defVal));
}
