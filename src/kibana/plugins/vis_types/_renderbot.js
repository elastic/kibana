define(function (require) {
  return function RenderbotFactory(Private) {

    /**
     * "Abstract" renderbot class which just defines the expected API
     *
     * @param {Vis} vis - the vis object that contains all configuration data required to render the vis
     * @param {jQuery<DOMElement>} $el - a jQuery wrapped element to render into
     */
    function Renderbot(vis, $el) {
      this.vis = vis;
      this.$el = $el;
    }

    /**
     * Each renderbot should implement a #render() method which
     * should accept an elasticsearch response and update the underlying visualization
     *
     * @override
     * @param {object} esResp - The raw elasticsearch response
     * @return {undefined}
     */
    Renderbot.prototype.render = function (esResp) {
      throw new Error('not implemented');
    };

    /**
     * Each renderbot should implement the #destroy() method which
     * should tear down the owned element, remove event listeners, etc.
     *
     * @override
     * @return {undefined}
     */
    Renderbot.prototype.destroy = function () {
      throw new Error('not implemented');
    };

    return Renderbot;
  };
});
