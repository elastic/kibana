var test = require('tap').test;
var format = require('util').format;
var dtest = require('./dtrace-test').dtraceTest;

test(
    'check probe object is not GCd while provider exists',
    dtest(
        function() {
        },
        [
            'dtrace', '-Zqn',
            'nodeapp$target:::gcprobe{ printf("%d\\n", arg0); }',
            '-c', format('node --expose_gc %s/gc_fire.js', __dirname)
        ],
        function(t, exit_code, traces) {
            t.notOk(exit_code, 'dtrace exited cleanly');
            t.equal(traces[0], '0');
        }
    )
);
