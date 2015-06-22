'use strict';
module.exports = function (date) {
	return (date || new Date()).toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC');
};
