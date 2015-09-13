'use strict';

module.exports = function intersection (haystack, array) {
   return array.some(function (v) {
        return ~haystack.indexOf(v);
    });
};
