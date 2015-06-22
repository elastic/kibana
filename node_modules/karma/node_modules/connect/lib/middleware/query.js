/*!
 * Connect - query
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2011 Sencha Inc.
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var qs = require('qs')
  , parseurl = require('parseurl');

/**
 * Query:
 *
 * Automatically parse the query-string when available,
 * populating the `req.query` object using
 * [qs](https://github.com/visionmedia/node-querystring).
 *
 * Examples:
 *
 *     connect()
 *       .use(connect.query())
 *       .use(function(req, res){
 *         res.end(JSON.stringify(req.query));
 *       });
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function query(){
  return function query(req, res, next){
    if (!req.query) {
      req.query = ~req.url.indexOf('?')
        ? qs.parse(parseurl(req).query)
        : {};
    }

    next();
  };
};
