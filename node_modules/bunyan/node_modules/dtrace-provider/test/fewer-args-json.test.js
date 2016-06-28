var test = require('tap').test;
var format = require('util').format;
var dtest = require('./dtrace-test').dtraceTest;

test(
    'firing JSON probe with too few arguments',
    dtest(
        function() {
        },
        [
            'dtrace', '-Zqn',
            'nodeapp$target:::p1{ printf("%s\\n%s\\n", copyinstr(arg0), copyinstr(arg1)); }',
            '-c', format('node %s/fewer-args-json_fire.js', __dirname)
        ],
        function(t, exit_code, traces) {
            t.notOk(exit_code, 'dtrace exited cleanly');
            t.equal(traces[0], '{"foo":1}');
            t.equal(traces[1], 'undefined');
        }
    )
);
