var test = require('tap').test;
var d = require('../dtrace-provider');

test(
    'firing probes when provider not enabled',
    function(t) {
        var dtp = d.createDTraceProvider("nodeapp");
        dtp.addProbe("probe1", "int");
        //dtp.enable();
        dtp.fire("probe1", function(p) { 
            t.notOk();
            return [1]; 
        });
        t.ok(1, 'no problem');
        t.end();
    }
);

