'use strict';

module.exports = function unquote (string) {
    return string.replace(/["']/g, '');
};
