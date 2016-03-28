module.exports = {
	/**
	 * Adds properties from source objects to a target object using ES5 `Object.defineProperty` instead of
	 * `[[Set]]`. This is necessary when copying properties that are ES5 accessor/mutators.
	 *
	 * @param {Object} target The object to which properties are added.
	 * @param {...Object} source The source object from which properties are taken.
	 * @returns {Object} The target object.
	 */
	mixin: function (target) {
		for (var i = 1, j = arguments.length; i < j; ++i) {
			var source = arguments[i];
			for (var key in source) {
				if (hasOwnProperty.call(source, key)) {
					Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
				}
			}
		}

		return target;
	},

	/**
	 * Attaches an event to a Node.js EventEmitter and returns a handle for removing the listener later.
	 *
	 * @param {EventEmitter} emitter A Node.js EventEmitter object.
	 * @param {string} event The name of the event to listen for.
	 * @param {Function} listener The event listener that will be invoked when the event occurs.
	 * @returns {{ remove: Function }} A remove handle.
	 */
	on: function (emitter, event, listener) {
		emitter.on(event, listener);
		return {
			remove: function () {
				this.remove = function () {};
				emitter.removeListener(event, listener);
			}
		};
	}
};
