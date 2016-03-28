var d = require('../dtrace-provider');

var dtp = d.createDTraceProvider('test');
dtp.addProbe('probe1', 'int', 'int');
dtp.addProbe('probe2', 'int', 'int');
dtp.enable();

var dtp2 = d.createDTraceProvider('test');
dtp2.addProbe('probe3', 'int', 'int');
dtp2.addProbe('probe1', 'int', 'int');
dtp2.enable();

var dtp3 = d.createDTraceProvider('test', 'mymod1');
dtp3.addProbe('probe1', 'int', 'int');
dtp3.addProbe('probe2', 'int', 'int');
dtp3.enable();

var dtp4 = d.createDTraceProvider('test', 'mymod2');
dtp4.addProbe('probe1', 'int', 'int');
dtp4.addProbe('probe3', 'int', 'int');
dtp4.enable();

dtp.fire('probe1', function () {
    return ([12, 3]);
});

dtp2.fire('probe1', function () {
    return ([12, 73]);
});

dtp3.fire('probe1', function () {
    return ([12, 3]);
});

dtp4.fire('probe1', function () {
    return ([12, 73]);
});
