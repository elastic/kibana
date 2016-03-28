var d = require('../dtrace-provider');
var dtp = d.createDTraceProvider("nodeapp");
dtp.addProbe("probe1", "int");
dtp.enable();
dtp.fire("probe1", function(p) { return [1]; });
dtp.enable();
dtp.fire("probe1", function(p) { return [2]; });
