/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function(source) {
	if(this.cacheable) this.cacheable();
	return JSON.stringify(source);
}