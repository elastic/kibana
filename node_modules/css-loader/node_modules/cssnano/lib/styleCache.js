'use strict';

var postcss = require('postcss');

module.exports = postcss.plugin('cssnano-reset-stylecache', function () {
    return function (css, result) {
        result.root.styleCache = {
            colon:         ':',
            indent:        '',
            beforeDecl:    '',
            beforeRule:    '',
            beforeOpen:    '',
            beforeClose:   '',
            beforeComment: '',
            after:         '',
            emptyBody:     '',
            commentLeft:   '',
            commentRight:  ''
        };
    };
});
