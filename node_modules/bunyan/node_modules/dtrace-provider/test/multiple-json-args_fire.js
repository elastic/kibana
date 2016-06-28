var d = require('../dtrace-provider');
var provider = d.createDTraceProvider("nodeapp");
var probe = provider.addProbe("json1", "json", "json");
provider.enable();

var obj1 = { "value": "abc" };
var obj2 = { "value": "def" };

probe.fire(function(p) {
    return [obj1, obj2];
});
