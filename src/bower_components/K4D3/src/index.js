define(function(require) {

    var k4 = {
        version: '0.0.0',
        tooltip: require('./src/tooltip'),
        legend: require('./src/legend'),
        Chart: require('./src/core'),
        histogram: require('./src/modules/histogram')
    };

    return k4;
});
