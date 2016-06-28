var d = require('../dtrace-provider');
var provider = d.createDTraceProvider("nodeapp");
var probe = provider.addProbe("json1", "json");
provider.enable();

var obj = new Object;
obj.foo = 42;
obj.bar = 'forty-two';

probe.fire(function(p) {
    return [obj];
});
