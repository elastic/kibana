var d = require('../dtrace-provider');
var provider = d.createDTraceProvider("nodeapp");
var probe = provider.addProbe("p1", "int", "int");
provider.enable();

probe.fire(function(p) {
    return [1, 2, 3, 4];
});
