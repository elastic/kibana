import expect from 'expect.js';
import plugin from '../';
import mockKibana from './fixtures/kibana';

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
      expect(canvas.addFunction).to.be.a('function');
      expect(canvas.addType).to.be.a('function');
    });
  });
});
