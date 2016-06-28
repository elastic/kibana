'use strict';

var istanbul = require('istanbul');

module.exports = function(source) {
    var instrumenter = new istanbul.Instrumenter({
        embedSource: true,
        noAutoWrap: true
    });

    if (this.cacheable) {
        this.cacheable();
    }

    return instrumenter.instrumentSync(source, this.resourcePath);
};
