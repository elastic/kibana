// Load modules

var Code = require('code');
var Lab = require('lab');
var SystemMonitor = require('../lib/system');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var expect = Code.expect;
var describe = lab.describe;
var it = lab.it;


describe('System Monitor', function () {

    describe('mem()', function () {

        it('returns an object with the current memory usage', function (done) {

            var monitor = SystemMonitor;

            monitor.mem(function (err, mem) {

                expect(err).not.to.exist();
                expect(mem).to.exist();
                expect(mem.total).to.exist();
                expect(mem.free).to.exist();
                done();
            });
        });
    });
});
