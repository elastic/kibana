var test = require('tap').test;
var format = require('util').format;
var dtest = require('./dtrace-test').dtraceTest;

test(
    'firing probe with too few arguments',
    dtest(
        function() {
        },
        [
            'dtrace', '-Zqn',
            'nodeapp$target:::p1{ printf("%d\\n%d\\n%s\\n", arg0, arg1, copyinstr(arg2)); }',
            '-c', format('node %s/fewer-args_fire.js', __dirname)
        ],
        function(t, exit_code, traces) {
            t.notOk(exit_code, 'dtrace exited cleanly');
            t.equal(traces[0], '42');
            t.equal(traces[1], '0');
            t.equal(traces[2], 'undefined');
        }
    )
);
