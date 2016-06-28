var test = require('tap').test;
var format = require('util').format;
var dtest = require('./dtrace-test').dtraceTest;

if (process.platform == 'darwin') {
    var dscript = 'testlibusdt*:::32probe{ printf("%s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s\\n", copyinstr((user_addr_t)args[0]), copyinstr((user_addr_t)args[1]), copyinstr((user_addr_t)args[2]), copyinstr((user_addr_t)args[3]), copyinstr((user_addr_t)args[4]), copyinstr((user_addr_t)args[5]), copyinstr((user_addr_t)args[6]), copyinstr((user_addr_t)args[7]), copyinstr((user_addr_t)args[8]), copyinstr((user_addr_t)args[9]), copyinstr((user_addr_t)args[10]), copyinstr((user_addr_t)args[11]), copyinstr((user_addr_t)args[12]), copyinstr((user_addr_t)args[13]), copyinstr((user_addr_t)args[14]), copyinstr((user_addr_t)args[15]), copyinstr((user_addr_t)args[16]), copyinstr((user_addr_t)args[17]), copyinstr((user_addr_t)args[18]), copyinstr((user_addr_t)args[19]), copyinstr((user_addr_t)args[20]), copyinstr((user_addr_t)args[21]), copyinstr((user_addr_t)args[22]), copyinstr((user_addr_t)args[23]), copyinstr((user_addr_t)args[24]), copyinstr((user_addr_t)args[25]), copyinstr((user_addr_t)args[26]), copyinstr((user_addr_t)args[27]), copyinstr((user_addr_t)args[28]), copyinstr((user_addr_t)args[29]), copyinstr((user_addr_t)args[30]), copyinstr((user_addr_t)args[31])); }';
}
else {
    var dscript = 'testlibusdt*:::32probe{ printf("%s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s %s\\n", copyinstr((uintptr_t)args[0]), copyinstr((uintptr_t)args[1]), copyinstr((uintptr_t)args[2]), copyinstr((uintptr_t)args[3]), copyinstr((uintptr_t)args[4]), copyinstr((uintptr_t)args[5]), copyinstr((uintptr_t)args[6]), copyinstr((uintptr_t)args[7]), copyinstr((uintptr_t)args[8]), copyinstr((uintptr_t)args[9]), copyinstr((uintptr_t)args[10]), copyinstr((uintptr_t)args[11]), copyinstr((uintptr_t)args[12]), copyinstr((uintptr_t)args[13]), copyinstr((uintptr_t)args[14]), copyinstr((uintptr_t)args[15]), copyinstr((uintptr_t)args[16]), copyinstr((uintptr_t)args[17]), copyinstr((uintptr_t)args[18]), copyinstr((uintptr_t)args[19]), copyinstr((uintptr_t)args[20]), copyinstr((uintptr_t)args[21]), copyinstr((uintptr_t)args[22]), copyinstr((uintptr_t)args[23]), copyinstr((uintptr_t)args[24]), copyinstr((uintptr_t)args[25]), copyinstr((uintptr_t)args[26]), copyinstr((uintptr_t)args[27]), copyinstr((uintptr_t)args[28]), copyinstr((uintptr_t)args[29]), copyinstr((uintptr_t)args[30]), copyinstr((uintptr_t)args[31])); }';
}

test(
    '32-arg probe',
    dtest(
        function() {
            var d = require('../dtrace-provider');
            // define this provider here, even though we won't fire it, so that we
            // can start dtrace with an otherwise unstable set of probes - -Z
            // won't work here.
            var provider = d.createDTraceProvider("testlibusdt");
            var p = provider.addProbe(
                "32probe",
                "char *", "char *", "char *", "char *", "char *", "char *", "char *", "char *",
                "char *", "char *", "char *", "char *", "char *", "char *", "char *", "char *",
                "char *", "char *", "char *", "char *", "char *", "char *", "char *", "char *",
                "char *", "char *", "char *", "char *", "char *", "char *", "char *", "char *");
            provider.enable();
        },
        ['dtrace', '-qn', 
         dscript,
         '-c', format('node %s/32probe-char_fire.js', __dirname)
        ],
        function(t, exit_code, traces) {
            t.notOk(exit_code, 'dtrace exited cleanly');
            t.equal(traces.length, 1);

            var letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
                           'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
                           'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
                           'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F'];
            
            var traced = traces[0].split(' ');
            for (var i = 0; i < 32; i++) {
                t.equal(traced[i], letters[i],
                        format('arg%d of a 32-arg probe firing should be %s', i, letters[i]));
            }
        }
    )
);
