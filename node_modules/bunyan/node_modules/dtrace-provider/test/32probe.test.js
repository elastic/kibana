var test = require('tap').test;
var format = require('util').format;
var dtest = require('./dtrace-test').dtraceTest;

test(
    '32-arg probe',
    dtest(
        function() {
            var d = require('../dtrace-provider');
            // define this provider here, even though we won't fire it, so that we
            // can start dtrace with an otherwise unstable set of probes - -Z
            // won't work here.
            var provider = d.createDTraceProvider("testlibusdt");
            var probe = provider.addProbe("32probe",
                                          "int", "int", "int", "int", "int", "int", "int", "int",
                                          "int", "int", "int", "int", "int", "int", "int", "int",
                                          "int", "int", "int", "int", "int", "int", "int", "int",
                                          "int", "int", "int", "int", "int", "int", "int", "int");
            provider.enable();
        },
        ['dtrace', '-qn', 
         'testlibusdt*:::32probe{ printf("%d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d %d\\n", args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9], args[10], args[11], args[12], args[13], args[14], args[15], args[16], args[17], args[18], args[19], args[20], args[21], args[22], args[23], args[24], args[25], args[26], args[27], args[28], args[29], args[30], args[31]) }',
        '-c', format('node %s/32probe_fire.js', __dirname)
        ],
        function(t, exit_code, traces) {
            t.notOk(exit_code, 'dtrace exited cleanly');
            t.equal(traces.length, 32, 'got 32 traces');
            
            var args = [];
            for (var i = 1; i <= 32; i++) {
                args.push(i);
                var traced = traces[i - 1].split(' ');
                args.forEach(function(n) {
                    t.equal(traced[n - 1], [n].toString(),
                            format('arg%d of a %d-arg probe firing should be %d', n - 1, i, n));
                });
            }
        }
    )
);
