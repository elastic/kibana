define(["require", "exports"], function (require, exports) {
    var Bar = (function () {
        function Bar() {
            this.hasRun = false;
        }
        Bar.prototype.run = function () {
            throw new Error('foo');
        };
        return Bar;
    })();
    return Bar;
});
//# sourceMappingURL=maps/bar.js.map
