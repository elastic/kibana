export function getEmbeddableHandlerMock(config) {
  const embeddableHandlerMockDefaults = {
    getEditPath: () => {},
    getTitleFor: () => {},
    render: jest.fn(),
    destroy: () => {},
    addDestroyEmeddable: () => {},
  };
  return Object.assign(embeddableHandlerMockDefaults, config);
}
