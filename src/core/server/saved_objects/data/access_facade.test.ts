import { AccessFacade, AccessFacadeOptions } from './access_facade';

describe('access facade', () => {
  describe('#constructor', () => {
    const options: AccessFacadeOptions = {
      index: '.kibana',
      mappings: {
        foo: {},
      },
      onBeforeWrite: () => {},
      callCluster: () => {},
    };

    test('creates an access facade instance', () => {
      const facade = new AccessFacade(options);
      expect(facade).toBeDefined();
    });
  });

  describe('#create method', () => {
    test('creates index');
    test('creates document');
  });

  describe('#bulkCreate method', () => {});

  describe('#delete method', () => {});

  describe('#find method', () => {});

  describe('#bulkGet method', () => {});

  describe('#get method', () => {});

  describe('#update method', () => {});
});
