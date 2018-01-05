export function getContainerApiMock(config = {}) {
  const containerApiMockDefaults = {
    addFilter: () => {},
    getAppState: () => {},
    createChildUistate: () => {},
    registerPanelIndexPattern: () => {},
    updatePanel: () => {}
  };
  return Object.assign(containerApiMockDefaults, config);
}
