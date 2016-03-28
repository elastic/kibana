// Load modules


// Declare internals

var internals = {};


exports.serial = function (array, method, callback) {

    var il = array.length;
    if (!il) {
        callback();
    }
    else {
        var i = 0;
        var iterate = function () {

            var done = function (err) {

                if (err) {
                    callback(err);
                }
                else {
                    i += 1;
                    if (i < il) {
                        iterate();
                    }
                    else {
                        callback();
                    }
                }
            };

            method(array[i], done);
        };

        iterate();
    }
};


exports.parallel = function (array, method, callback) {

    var il = array.length;
    if (!il) {
        callback();
    }
    else {
        var count = 0;
        var errored = false;

        var done = function (err) {

            if (!errored) {
                if (err) {
                    errored = true;
                    callback(err);
                }
                else {
                    count += 1;
                    if (count === array.length) {
                        callback();
                    }
                }
            }
        };

        for (var i = 0; i < il; ++i) {
            method(array[i], done);
        }
    }
};


exports.parallel.execute = function (fnObj, callback) {

    var result = {};
    if (!fnObj) {
        return callback(null, result);
    }

    var keys = Object.keys(fnObj);
    var count = 0;
    var il = keys.length;
    var errored = false;

    if (!il) {
        return callback(null, result);
    }

    var done = function (key) {

        return function (err, val) {

            if (!errored) {
                if (err) {
                    errored = true;
                    callback(err);
                }
                else {
                    result[key] = val;
                    if (++count === il) {
                        callback(null, result);
                    }
                }
            }
        };
    };

    for (var i = 0; i < il; ++i) {
        if (!errored) {
            var key = keys[i];
            fnObj[key](done(key));
        }
    }
};
