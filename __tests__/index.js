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
      expect(canvas.addFunction).to.be.a('function');
      expect(canvas.addType).to.be.a('function');
      expect(canvas.addExpressionType).to.be.a('function');
      expect(canvas.addArgType).to.be.a('function');
    });
  });
});
