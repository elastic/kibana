var test = require('tap').test;
var format = require('util').format;
var dtest = require('./dtrace-test').dtraceTest;

test(
    'basic probes',
    dtest(
        function() {
        },
        [
            'dtrace', '-Zqn',
            'nodeapp$target:::p1{ printf("%d\\n", arg0); printf("%s\\n", copyinstr(arg1)) }',
            '-c', format('node %s/basic_fire.js', __dirname)
        ],
        function(t, exit_code, traces) {
            t.notOk(exit_code, 'dtrace exited cleanly');
            t.equal(traces[0], '42');
            t.equal(traces[1], 'forty-two');
        }
    )
);
