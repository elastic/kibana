var d = require('../dtrace-provider');
var dtp = d.createDTraceProvider("nodeapp");

// don't assign the returned probe object anywhere
dtp.addProbe("gcprobe", "int");
dtp.enable();

// run GC
gc();

// probe object should still be around
dtp.fire("gcprobe", function() {
    return [];
});
