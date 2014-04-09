(function(root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else {
        root.k4 = factory();
    }
}(this, function() {