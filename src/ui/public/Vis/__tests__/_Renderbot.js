import expect from 'expect.js';
import ngMock from 'ngMock';
import VisRenderbotProvider from 'ui/Vis/Renderbot';
describe('renderbot', function () {
  var Renderbot;

  function init() {
    ngMock.module('kibana');

    ngMock.inject(function (Private) {
      Renderbot = Private(VisRenderbotProvider);
    });
  }

  describe('API', function () {
    var vis;
    var $el;
    var renderbot;
    var uiState;

    beforeEach(init);
    beforeEach(function () {
      vis = { hello: 'world' };
      $el = 'element';
      uiState = {};
      renderbot = new Renderbot(vis, $el, uiState);
    });

    it('should have expected methods', function () {
      expect(renderbot).to.have.property('render');
      expect(renderbot).to.have.property('destroy');
      expect(renderbot).to.have.property('updateParams');
    });

    it('should throw if not implemented', function () {
      expect(renderbot.render).to.throwError();
      expect(renderbot.destroy).to.throwError();
    });
  });
});
