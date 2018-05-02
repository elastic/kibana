/* global jest */
export function getEmbeddableFactoryMock(config) {
  const embeddableFactoryMockDefaults = {
    create: jest.fn(() => Promise.resolve({})),
  };
  return Object.assign(embeddableFactoryMockDefaults, config);
}
