var DTraceProvider;

function DTraceProviderStub() {}
DTraceProviderStub.prototype.addProbe = function(name) {
    var p = { 'fire': function () {} };
    this[name] = p;
    return (p);
};
DTraceProviderStub.prototype.enable = function() {};
DTraceProviderStub.prototype.fire = function() {};
DTraceProviderStub.prototype.disable = function() {};

var builds = ['Release', 'default', 'Debug'];

for (var i in builds) {
    try {
        var binding = require('./build/' + builds[i] + '/DTraceProviderBindings');
        DTraceProvider = binding.DTraceProvider;
        break;
    } catch (e) {
        // if the platform looks like it _should_ have DTrace
        // available, log a failure to load the bindings.
        if (process.platform == 'darwin' ||
            process.platform == 'solaris' ||
            process.platform == 'freebsd') {
            console.error(e);
        }
    }
}

if (!DTraceProvider) {
    DTraceProvider = DTraceProviderStub;
}

exports.DTraceProvider = DTraceProvider;
exports.createDTraceProvider = function(name, module) {
    if (arguments.length == 2)
        return (new exports.DTraceProvider(name, module));
    return (new exports.DTraceProvider(name));
};
