(function(root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.k4 = factory();
    }
}(this, function(require) {
    var k4 = {
        version: '0.0.0',
        tooltip: require('./bower_components/K4D3/src/tooltip'),
        legend: require('./bower_components/K4D3/src/legend'),
        Chart: require('./bower_components/K4D3/src/core'),
        histogram: require('./bower_components/K4D3/src/modules/histogram')
    };

    return k4;
}));

