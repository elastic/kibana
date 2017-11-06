export function getEmbeddableHandlerMock(config) {
  const embeddableHandlerMockDefaults = {
    getEditPath: () => {},
    getTitleFor: () => {},
    render: jest.fn()
  };
  return Object.assign(embeddableHandlerMockDefaults, config);
}
