/* global jest */
export function getEmbeddableFactoryMock(config) {
  const embeddableFactoryMockDefaults = {
    getEditPath: () => {},
    getTitleFor: () => {},
    render: jest.fn(),
    destroy: () => {},
    addDestroyEmeddable: () => {},
  };
  return Object.assign(embeddableFactoryMockDefaults, config);
}
