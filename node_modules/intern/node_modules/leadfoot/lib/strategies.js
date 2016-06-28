var STRATEGIES = [
	'class name',
	'css selector',
	'id',
	'name',
	'link text',
	'partial link text',
	'tag name',
	'xpath'
];

var SUFFIXES = STRATEGIES.map(function (strategy) {
	return strategy.replace(/(?:^| )([a-z])/g, function (_, letter) {
		return letter.toUpperCase();
	});
});

STRATEGIES.suffixes = SUFFIXES;
STRATEGIES.applyTo = function (prototype) {
	STRATEGIES.forEach(function (strategy, index) {
		var suffix = SUFFIXES[index];

		prototype['findBy' + suffix] = function (value) {
			return this.find(strategy, value);
		};

		prototype['findDisplayedBy' + suffix] = function (value) {
			return this.findDisplayed(strategy, value);
		};

		prototype['waitForDeletedBy' + suffix] = function (value) {
			return this.waitForDeleted(strategy, value);
		};

		if (strategy !== 'id') {
			prototype['findAllBy' + suffix] = function (value) {
				return this.findAll(strategy, value);
			};
		}
	});
};

module.exports = STRATEGIES;
