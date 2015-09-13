'use strict';

/**
 * Capitalize the first letter of a string
 * @param  {string} string
 * @return {string}
 */
module.exports = function capitalize (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};
