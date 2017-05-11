import expect from 'expect.js';
import mockKibana from './fixtures/kibana';
import plugin from '../';

describe('canvas plugin', () => {
  let instance;

  beforeEach(() => {
    instance = plugin(mockKibana);
  });

  describe('init', () => {
    beforeEach(() => {
      instance.init();
    });

    it('exposes plugin hooks', () => {
      const { canvas } = instance.server.plugins;
      expect(canvas).to.have.property('addFunction');
      expect(canvas).to.have.property('addType');
    });
  });
});
