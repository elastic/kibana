// see 32probe-char.test.js

var d = require('../dtrace-provider');

var provider = d.createDTraceProvider("testlibusdt");
var probe = provider.addProbe(
    "32probe",
    "char *", "char *", "char *", "char *", "char *", "char *", "char *", "char *",
    "char *", "char *", "char *", "char *", "char *", "char *", "char *", "char *",
    "char *", "char *", "char *", "char *", "char *", "char *", "char *", "char *",
    "char *", "char *", "char *", "char *", "char *", "char *", "char *", "char *");
provider.enable();

var letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h',
               'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
               'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
               'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F'];

probe.fire(function(p) {
    return letters;
});

