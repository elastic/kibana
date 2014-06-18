define(function(require) {

    var k4 = {
        version: '0.0.0',
        legend: require('src/modules/legend'),
        Chart: require('src/core'),
        histogram: require('src/modules/histogram'),
        line: require('src/modules/lineChart'),
        area: require('src/modules/areaChart'),
    };

    return k4;
});
