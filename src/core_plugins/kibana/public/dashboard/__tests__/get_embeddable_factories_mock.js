/* global jest */
export function getEmbeddableFactoryMock(config) {
  const embeddableFactoryMockDefaults = {
    getEditPath: () => {},
    getTitleFor: () => {},
    render: jest.fn(() => Promise.resolve({})),
    destroy: () => {},
    addDestroyEmeddable: () => {},
  };
  return Object.assign(embeddableFactoryMockDefaults, config);
}
