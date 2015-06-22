/*!
	get-urls
	Get all urls in a string
	https://github.com/sindresorhus/get-urls
	by Sindre Sorhus
	MIT License
*/
(function () {
	'use strict';

	var uniq = function (el, i, self) {
		return self.indexOf(el) === i;
	};

	var getUrls = function (str) {
		var reUrl = /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;
		var urls = str.match(reUrl);

		if (!urls) {
			return [];
		}

		return urls.map(function (url) {
			// cleanup and normalize the url
			return url.trim().replace(/\.*$/, '').replace(/^(?!https?:\/\/)/, 'http://');
		}).filter(uniq);
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = getUrls;
	} else {
		window.getUrls = getUrls;
	}
})();
