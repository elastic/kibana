// see 32probe.test.js

var d = require('../dtrace-provider');

var provider = d.createDTraceProvider("testlibusdt");
var probe = provider.addProbe(
    "32probe",
    "int", "int", "int", "int", "int", "int", "int", "int",
    "int", "int", "int", "int", "int", "int", "int", "int",
    "int", "int", "int", "int", "int", "int", "int", "int",
    "int", "int", "int", "int", "int", "int", "int", "int");

provider.enable();

var args = [];
for (var n = 1; n <= 32; n++) {
    args.push(n);
    probe.fire(function(p) {
        return args;
    });
}
