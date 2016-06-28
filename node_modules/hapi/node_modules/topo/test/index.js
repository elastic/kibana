// Load modules

var Code = require('code');
var Lab = require('lab');
var Hoek = require('hoek');
var Topo = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Topo', function () {

    var testDeps = function (scenario) {

        var topo = new Topo();
        scenario.forEach(function (record, i) {

            var options = record.before || record.after || record.group ? { before: record.before, after: record.after, group: record.group } : null;
            topo.add(record.id, options);
        });

        return topo.nodes.join('');
    };

    it('sorts dependencies', function (done) {

        var scenario = [
            { id: '0', before: 'a' },
            { id: '1', after: 'f', group: 'a' },
            { id: '2', before: 'a' },
            { id: '3', before: ['b', 'c'], group: 'a' },
            { id: '4', after: 'c', group: 'b' },
            { id: '5', group: 'c' },
            { id: '6', group: 'd' },
            { id: '7', group: 'e' },
            { id: '8', before: 'd' },
            { id: '9', after: 'c', group: 'a' }
        ];

        expect(testDeps(scenario)).to.equal('0213547869');
        done();
    });

    it('sorts dependencies (before as array)', function (done) {

        var scenario = [
            { id: '0', group: 'a' },
            { id: '1', group: 'b' },
            { id: '2', before: ['a', 'b'] }
        ];

        expect(testDeps(scenario)).to.equal('201');
        done();
    });

    it('sorts dependencies (after as array)', function (done) {

        var scenario = [
            { id: '0', after: ['a', 'b'] },
            { id: '1', group: 'a' },
            { id: '2', group: 'b' }
        ];

        expect(testDeps(scenario)).to.equal('120');
        done();
    });


    it('sorts dependencies (seq)', function (done) {

        var scenario = [
            { id: '0' },
            { id: '1' },
            { id: '2' },
            { id: '3' }
        ];

        expect(testDeps(scenario)).to.equal('0123');
        done();
    });

    it('sorts dependencies (explicitly using after or before)', function (done) {

        var set = '0123456789abcdefghijklmnopqrstuvwxyz';
        var groups = set.split('');

        // Use Fisher-Yates for shuffling

        var fisherYates = function (array) {

            var i = array.length;
            while (--i) {
                var j = Math.floor(Math.random() * (i + 1));
                var tempi = array[i];
                var tempj = array[j];
                array[i] = tempj;
                array[j] = tempi;
            }
        };

        var scenarioAfter = [];
        var scenarioBefore = [];
        for (var i = 0, il = groups.length; i < il; ++i) {
            var item = {
                id: groups[i],
                group: groups[i]
            };
            var afterMod = {
                after: i ? groups.slice(0, i) : []
            };
            var beforeMod = {
                before: groups.slice(i + 1)
            };

            scenarioAfter.push(Hoek.applyToDefaults(item, afterMod));
            scenarioBefore.push(Hoek.applyToDefaults(item, beforeMod));
        }

        fisherYates(scenarioAfter);
        expect(testDeps(scenarioAfter)).to.equal(set);

        fisherYates(scenarioBefore);
        expect(testDeps(scenarioBefore)).to.equal(set);
        done();
    });

    it('throws on circular dependency', function (done) {

        var scenario = [
            { id: '0', before: 'a', group: 'b' },
            { id: '1', before: 'c', group: 'a' },
            { id: '2', before: 'b', group: 'c' }
        ];

        expect(function () {

            testDeps(scenario);
        }).to.throw('item added into group c created a dependencies error');

        done();
    });
});
