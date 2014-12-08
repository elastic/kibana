define(function (require) {
  var _ = require('lodash');
	return function mapAndFlattenFiltersProvider(Private, Promise) {
		var mapFilter = Private(require('components/filter_bar/lib/mapFilter'));
		return function (filters) {
			filters = _(filters)
				.filter(function (filter) {
					return filter;
				})
				.flatten(true)
				.value();

			return Promise.map(filters, mapFilter);
		};
	};
});
