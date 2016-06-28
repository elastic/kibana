var d = require('../dtrace-provider');
var provider = d.createDTraceProvider("nodeapp");
var probe = provider.addProbe("p1", "int", "char *");
provider.enable();

probe.fire(function(p) {
    return [42, 'forty-two'];
});
