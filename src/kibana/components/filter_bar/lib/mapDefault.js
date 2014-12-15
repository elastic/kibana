define(function (require) {
  return function mapDefaultProvider(Promise) {
		return function (filter) {
			var key, value;
			if (filter.query) {
				key = 'query';
        value = JSON.stringify(filter.query);
				return Promise.resolve({ key: key, value: value });
			}
			return Promise.reject(filter);
		};
  };
});
