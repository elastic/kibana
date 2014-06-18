define(function(require) {

    var _ = require('lodash');

    /* Returns an array of ordered keys for a data series
     * or several arrays of data values.
     */

    function orderKeys(data) {
        var uniqueXObjs = {}, orderedKeys;

        data.forEach(function (series) {
            series.values.forEach(function (d, i) {
                var key = d.x;
                uniqueXObjs[key] = uniqueXObjs[key] === void 0 ? i : Math.max(i, uniqueXObjs[key]);
            });
        });

        orderedKeys = _.chain(uniqueXObjs).pairs().sortBy(1).pluck(0).value();
        return orderedKeys;
    }

    /* Returns the indexed position of a value in an array. */
    function getIndexOf(val, arr) {
        var i, max = arr.length;
        for (i = 0; i < max; i++) {
            if (val == arr[i].x) {
                return i;
            }
        }
        return -1;
    }

    function createZeroFilledArray(orderedKeys) {
        var max = orderedKeys.length,
            i, arr = [];

        for (i = 0; i < max; i++) {
            var val = orderedKeys[i];
            arr.push({ x: val, y: 0});
        }

        return arr;
    }

    function modifyZeroFilledArray(zeroArray, dataArray) {
        var i, max = dataArray.length;

        for (i = 0; i < max; i++) {
            var val = dataArray[i],
                index = getIndexOf(val.x, zeroArray);

            zeroArray.splice(index, 1);
            zeroArray.splice(index, 0, val);
        }

        return zeroArray;
    }

    return function (data) {
        var i, max = data.series.length,
            orderedKeys = orderKeys(data.series);

        for (i = 0; i < max; i ++) {
            var zeroArray = createZeroFilledArray(orderedKeys),
                dataArray = data.series[i].values;
            data.series[i].values = modifyZeroFilledArray(zeroArray, dataArray);
        }

        return data;
    };
});