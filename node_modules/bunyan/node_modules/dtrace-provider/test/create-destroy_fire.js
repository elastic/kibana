var d = require('../dtrace-provider');

for (var i = 0; i < 10; i++) {
    //gc();
    var dtp = d.createDTraceProvider("nodeapp");
    dtp.addProbe("probe1", "int");
    dtp.enable();
    dtp.fire("probe1", function(p) { return [i]; });
    //dtp.disable();
}


