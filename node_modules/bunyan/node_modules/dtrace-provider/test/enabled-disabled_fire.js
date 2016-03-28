var d = require('../dtrace-provider');
var dtp = d.createDTraceProvider("nodeapp");
dtp.addProbe("probe1", "int");
dtp.enable();
dtp.fire("probe1", function(p) { return [0]; });

for (var i = 1; i <= 10; i++) {
    dtp.enable();
    dtp.fire("probe1", function(p) { return [i]; });
    dtp.disable();
    //gc();
}
dtp.fire("probe1", function(p) { return [42]; });

