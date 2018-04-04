export function getContainerApiMock(config = {}) {
  const containerApiMockDefaults = {
    addFilter: () => {},
    getAppState: () => {},
    registerPanelIndexPattern: () => {},
    updatePanel: () => {}
  };
  return Object.assign(containerApiMockDefaults, config);
}
