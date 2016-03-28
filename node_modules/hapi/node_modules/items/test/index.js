// Load modules

var Lab = require('lab');
var Items = require('../');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var it = lab.test;
var expect = Lab.expect;


describe('Items', function () {

    describe('serial()', function () {

        it('calls methods in serial', function (done) {

            var called = [];
            var array = [1, 2, 3, 4, 5];
            var method = function (item, next) {

                called.push(item);
                setTimeout(next, 5);
            };

            Items.serial(array, method, function (err) {

                expect(err).to.not.exist;
                expect(called).to.deep.equal(array);
                done();
            });
        });

        it('skips on empty array', function (done) {

            var called = [];
            var array = [];
            var method = function (item, next) {

                called.push(item);
                setTimeout(next, 5);
            };

            Items.serial(array, method, function (err) {

                expect(err).to.not.exist;
                expect(called).to.deep.equal(array);
                done();
            });
        });

        it('aborts with error', function (done) {

            var called = [];
            var array = [1, 2, 3, 4, 5];
            var method = function (item, next) {

                called.push(item);
                if (item === 3) {
                    return next('error')
                }

                setTimeout(next, 5);
            };

            Items.serial(array, method, function (err) {

                expect(err).to.equal('error');
                expect(called).to.deep.equal([1, 2, 3]);
                done();
            });
        });
    });

    describe('parallel()', function () {

        it('calls methods in parallel', function (done) {

            var called = [];
            var array = [[1, 1], [2, 4], [3, 2], [4, 3], [5, 5]];
            var method = function (item, next) {

                setTimeout(function () {

                    called.push(item[0]);
                    next();
                }, item[1]);
            };

            Items.parallel(array, method, function (err) {

                expect(err).to.not.exist;
                expect(called).to.deep.equal([1, 3, 4, 2, 5]);
                done();
            });
        });

        it('skips on empty array', function (done) {

            var called = [];
            var array = [];
            var method = function (item, next) {

                setTimeout(function () {

                    called.push(item[0]);
                    next();
                }, item[1]);
            };

            Items.parallel(array, method, function (err) {

                expect(err).to.not.exist;
                expect(called).to.deep.equal([]);
                done();
            });
        });

        it('aborts with error', function (done) {

            var called = [];
            var array = [[1, 1], [2, 4], [3, 2], [4, 3], [5, 5]];
            var method = function (item, next) {

                setTimeout(function () {

                    if (item[0] === 3) {
                        return next('error')
                    }

                    called.push(item[0]);
                    next();
                }, item[1]);
            };

            Items.parallel(array, method, function (err) {

                expect(err).to.equal('error');
                expect(called).to.deep.equal([1]);

                setTimeout(function () {

                    expect(called).to.deep.equal([1, 4, 2, 5]);
                    done();
                }, 6);
            });
        });
    });

    describe('parallel.execute()', function () {

        it('calls methods in parallel and returns the result', function (done) {

            var fns = {
                fn1: function (next) {

                    next(null, 'bye');
                },
                fn2: function (next) {

                    next(null, 'hi');
                }
            };

            Items.parallel.execute(fns, function (err, result) {

                expect(err).to.not.exist;
                expect(result.fn1).to.equal('bye');
                expect(result.fn2).to.equal('hi');
                done();
            });
        });

        it('returns an empty object to the callback when passed an empty object', function (done) {

            var fns = {};

            Items.parallel.execute(fns, function (err, result) {

                expect(err).to.not.exist;
                expect(Object.keys(result).length).to.equal(0);
                done();
            });
        });

        it('returns an empty object to the callback when passed a null object', function (done) {

            Items.parallel.execute(null, function (err, result) {

                expect(err).to.not.exist;
                expect(Object.keys(result).length).to.equal(0);
                done();
            });
        });

        it('exits early and result object is missing when an error is passed to callback', function (done) {

            var fns = {
                fn1: function (next) {

                    setImmediate(function () {

                        next(null, 'hello');
                    });
                },
                fn2: function (next) {

                    setImmediate(function () {

                        next(new Error('This is my error'));
                    });

                },
                fn3: function (next) {

                    setImmediate(function () {

                        next(null, 'bye');
                    });
                }
            };

            Items.parallel.execute(fns, function (err, result) {

                expect(err).to.exist;
                expect(result).to.not.exist;
                done();
            });
        });

        it('exits early and doesn\'t execute other functions on an error', function (done) {

            var fn2Executed = false;
            var fns = {
                fn1: function (next) {

                    next(new Error('This is my error'));
                },
                fn2: function (next) {

                    setImmediate(function () {

                        fn2Executed = true;
                        next();
                    });
                }
            };

            Items.parallel.execute(fns, function (err, result) {

                expect(err).to.exist;
                expect(result).to.not.exist;
                expect(fn2Executed).to.equal(false);
                done();
            });
        });

        it('handles multiple errors being returned by sending first error', function (done) {

            var fns = {
                fn1: function (next) {

                    next(new Error('fn1'));
                },
                fn2: function (next) {

                    next(new Error('fn2'));

                },
                fn3: function (next) {

                    next(new Error('fn3'));
                }
            };

            Items.parallel.execute(fns, function (err, result) {

                expect(err).to.exist;
                expect(result).to.not.exist;
                expect(err.message).to.equal('fn1');
                done();
            });
        });
    });
});