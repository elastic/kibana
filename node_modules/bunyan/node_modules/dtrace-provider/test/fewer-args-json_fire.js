var d = require('../dtrace-provider');
var provider = d.createDTraceProvider("nodeapp");
var probe = provider.addProbe("p1", "json", "json");
provider.enable();

probe.fire(function(p) {
    return [{ "foo": 1 }];
});
