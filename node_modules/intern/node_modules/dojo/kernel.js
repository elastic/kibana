(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    exports.version = {
        major: 2,
        minor: 0,
        patch: 0,
        flag: 'dev',
        revision: ('$Rev$'.match(/[0-9a-f]{7,}/) || [])[0],
        toString: function () {
            var v = this;
            return v.major + '.' + v.minor + '.' + v.patch +
                (v.flag ? '-' + v.flag : '') +
                (v.revision ? '+' + v.revision : '');
        }
    };
});
//# sourceMappingURL=_debug/kernel.js.map