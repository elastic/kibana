var test = require('tap').test;
var format = require('util').format;
var dtest = require('./dtrace-test').dtraceTest;

test(
    'adding probes to an existing provider',
    dtest(
        function() { },
        [
            'dtrace', '-Zqn',
            'nodeapp*:::{ printf("%d\\n", arg0); }',
            '-c', format('node %s/add-probes_fire.js', __dirname)
        ],
        function(t, exit_code, traces) {
            t.notOk(exit_code, 'dtrace exited cleanly');
            t.equal(traces.length, 46);
            traces.sort(function(a, b) { return a - b });
            t.equal(traces[0], '0');
            var x = 1;
            for (var i = 1; i < 10; i++) {
                for (var j = 0; j < i; j++) {
                    t.equal(traces[x++], [i].toString());
                }
            }
        }
    )
);
