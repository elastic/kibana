define(function(require) {
    'use strict';

    var d3 = require('lib/d3/d3'),
        _ = require('lib/lodash/dist/lodash');

    return function zeroInj(selection) {
        var uniqueXKeys, uniqueXObjs = {};

        // Gets the unique x values values from the data set.
        d3.selectAll(selection).each(function(d) {
            d.layers.forEach(function(e) {
                e.values.forEach(function(f, i) {
                    if (uniqueXObjs[f.x]) {
                        if ( uniqueXObjs[f.x].i > i ) {
                            uniqueXObjs[f.x].i = i;
                        } else if ( uniqueXObjs[f.x].i < i ) {
                            uniqueXObjs[f.x].i = i++;
                        }
                    } else {
                        // add new obj with x val as key 
                        uniqueXObjs[f.x] = {"x": f.x, "i": i};
                    }
                });
            });
        });

        // sort by n.i and get keys n.x
        uniqueXKeys = _.chain(uniqueXObjs)
            .sortBy( function (n){ return n.i; } )
            .pluck ( function (n){ return n.x; } )
            .value();

        d3.selectAll(selection).each(function(data) {
            data.layers.forEach(function(series) {
                uniqueXKeys.forEach(function(key, keyIndex) {
                    var val = series.values[keyIndex];
                    if (!val || val.x !== key) {
                        series.values.splice(keyIndex, 0, { x: key, y: 0 });
                    }
                });
            });
        });

        return selection;
    };
});