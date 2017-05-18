// State store for managing the state involved with importing advanced settings
const AdvancedImportState = () => {
  const settings = [];
  let importing = false;

  const isImporting = () => importing;
  const setImporting = value => importing = value;
  const addSetting = (name, value, oldValue, config, isValid) => {
    const setting = { name, value, oldValue, config, isValid };
    settings.push(setting);
    return setting;
  };
  const getSettings = () => settings;
  const clearSettings = () => settings.length = 0;
  const markAsImported = setting => {
    setting.$imported = true;
    setting.$abandoned = false;
  };
  const markAsAbandoned = setting => {
    setting.$abandoned = true;
    setting.$imported = false;
  };
  const hasBeenImported = setting => setting.$imported;
  const hasBeenAbandoned = setting => setting.$abandoned;

  return {
    isImporting,
    setImporting,
    addSetting,
    getSettings,
    clearSettings,
    markAsImported,
    markAsAbandoned,
    hasBeenImported,
    hasBeenAbandoned,
  };
};

export { AdvancedImportState };
