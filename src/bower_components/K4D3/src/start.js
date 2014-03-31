(function(root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.k4 = factory();
    }
}(this, function() {
    var k4 = { version: '0.0.0' };

