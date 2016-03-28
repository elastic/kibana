// node --expose_gc ...

var d = require('../dtrace-provider');

for (var i = 0; i < 1000000; i++) {
    console.log("i: " + i);
    var dtp = d.createDTraceProvider("testlibusdt" + i);
    var p = dtp.addProbe("gcprobe");
    dtp.enable();
    dtp.disable();
}
gc();
