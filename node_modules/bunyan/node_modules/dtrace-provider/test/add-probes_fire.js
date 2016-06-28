var d = require('../dtrace-provider');
var dtp = d.createDTraceProvider("nodeapp");
dtp.addProbe("probe0", "int");
dtp.enable();
dtp.fire("probe0", function(p) { return [0]; });

for (var i = 1; i < 10; i++) {
    dtp.addProbe("probe" + i, "int");
    dtp.disable();
    dtp.enable();
    for (var j = 0; j < i; j++) {
        dtp.fire("probe" + j, function(p) { return [i]; });
    }
}
