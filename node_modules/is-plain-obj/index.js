'use strict';
var toString = Object.prototype.toString;
var hasOwn = Object.prototype.hasOwnProperty;

module.exports = function (x) {
	var ctor;
	return toString.call(x) === '[object Object]' && (ctor = x.constructor, hasOwn.call(x, 'constructor') || typeof ctor !== 'function' || ctor instanceof ctor);
};
