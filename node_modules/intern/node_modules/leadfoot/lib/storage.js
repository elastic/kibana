/*jshint camelcase:false */
var METHODS = {
	get_StorageKeys: function (type) {
		return function () {
			return this._get(type + '_storage');
		};
	},

	set_StorageItem: function (type) {
		return function (key, value) {
			return this._post(type + '_storage', {
				key: key,
				value: value
			});
		};
	},

	clear_Storage: function (type) {
		return function () {
			return this._delete(type + '_storage');
		};
	},

	get_StorageItem: function (type) {
		return function (key) {
			return this._get(type + '_storage/key/$0', null, [ key ]);
		};
	},

	delete_StorageItem: function (type) {
		return function (key) {
			return this._delete(type + '_storage/key/$0', null, [ key ]);
		};
	},

	get_StorageLength: function (type) {
		return function () {
			return this._get(type + '_storage/size');
		};
	}
};

module.exports = {
	applyTo: function (prototype, type) {
		var methodType = type.charAt(0).toUpperCase() + type.slice(1);
		for (var method in METHODS) {
			prototype[method.replace('_', methodType)] = METHODS[method](type);
		}
	}
};
