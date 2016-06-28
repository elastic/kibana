"use strict";

/*!
 * knox - Client
 * Copyright(c) 2010 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter
  , debug = require('debug')('knox')
  , utils = require('./utils')
  , auth = require('./auth')
  , http = require('http')
  , https = require('https')
  , url = require('url')
  , mime = require('mime')
  , fs = require('fs')
  , crypto = require('crypto')
  , xml2js = require('xml2js')
  , StreamCounter = require('stream-counter')
  , qs = require('querystring');

// The max for multi-object delete, bucket listings, etc.
var BUCKET_OPS_MAX = 1000;

// http://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html
var MIN_BUCKET_LENGTH = 3;
var MAX_NON_US_STANDARD_BUCKET_LENGTH = 63;
var MAX_US_STANDARD_BUCKET_LENGTH = 255;
var US_STANDARD_BUCKET = /^[A-Za-z0-9\._-]*$/;
var BUCKET_LABEL = /^(?:[a-z0-9][a-z0-9-]*[a-z0-9]|[a-z0-9])$/;
var IPV4_ADDRESS = /^(\d{1,3}\.){3}(\d{1,3})$/;

/**
 * Register event listeners on a request object to convert standard http
 * request events into appropriate call backs.
 * @param {Request} req The http request
 * @param {Function} fn(err, res) The callback function.
 * err - The exception if an exception occurred while sending the http
 *       request (for example if internet connection was lost).
 * res - The http response if no exception occurred.
 * @api private
 */
function registerReqListeners(req, fn){
  var hasCalledBack = false;

  function cleanup() {
    hasCalledBack = true;
    req.removeListener('response', onResponse);
    req.removeListener('error', onError);
  }

  function onResponse(res){
    if (!hasCalledBack) {
      cleanup();
      fn(null, res);
    }
  }

  function onError(err){
    if (!hasCalledBack) {
      cleanup();
      fn(err);
    }
  }

  req.on('response', onResponse);
  req.on('error', onError);
}

function ensureLeadingSlash(filename) {
  return filename[0] !== '/' ? '/' + filename : filename;
}

function removeLeadingSlash(filename) {
  return filename[0] === '/' ? filename.substring(1) : filename;
}

function encodeSpecialCharacters(filename) {
  // Note: these characters are valid in URIs, but S3 does not like them for
  // some reason.
  return encodeURI(filename).replace(/[!'()* ]/g, function (char) {
    return '%' + char.charCodeAt(0).toString(16);
  });
}

function getHeader(headers, headerNameLowerCase) {
  for (var header in headers) {
    if (header.toLowerCase() === headerNameLowerCase) {
      return headers[header];
    }
  }
  return null;
}

function isNotDnsCompliant(bucket) {
  if (bucket.length > MAX_NON_US_STANDARD_BUCKET_LENGTH) {
    return 'is more than ' + MAX_NON_US_STANDARD_BUCKET_LENGTH + ' characters';
  }

  if (IPV4_ADDRESS.test(bucket)) {
    return 'is formatted as an IPv4 address';
  }

  var bucketLabels = bucket.split('.');
  var bucketLabelsAreValid = bucketLabels.every(function (label) {
    return BUCKET_LABEL.test(label);
  });

  if (!bucketLabelsAreValid) {
    return 'does not consist of valid period-separated labels';
  }

  return false;
}

function isInvalid(bucket) {
  if (bucket.length < MIN_BUCKET_LENGTH) {
    return 'is less than ' + MIN_BUCKET_LENGTH + ' characters';
  }
  if (bucket.length > MAX_US_STANDARD_BUCKET_LENGTH) {
    return 'is more than ' + MAX_US_STANDARD_BUCKET_LENGTH + ' characters';
  }

  if (!US_STANDARD_BUCKET.test(bucket)) {
    return 'contains invalid characters';
  }

  return false;
}

function containsPeriod(bucket) {
  return bucket.indexOf('.') !== -1;
}

function autoDetermineStyle(options) {
  if (!options.style && options.secure !== false &&
      containsPeriod(options.bucket)) {
    options.style = 'path';
    return;
  }

  var dnsUncompliance = isNotDnsCompliant(options.bucket);
  if (dnsUncompliance) {
    if (options.style === 'virtualHosted') {
      throw new Error('Cannot use "virtualHosted" style with a ' +
                      'DNS-uncompliant bucket name: "' + options.bucket +
                      '" is ' + dnsUncompliance + '.');
    }

    options.style = 'path';
    return;
  }

  if (!options.style) {
    options.style = 'virtualHosted';
  }
}

/**
 * Get headers needed for Client#copy and Client#copyTo.
 *
 * @param {String} sourceFilename
 * @param {Object} headers
 * @api private
 */

function getCopyHeaders(sourceBucket, sourceFilename, headers) {
  sourceFilename = encodeSpecialCharacters(ensureLeadingSlash(sourceFilename));
  headers = utils.merge({
    Expect: '100-continue'
  }, headers || {});
  headers['x-amz-copy-source'] = '/' + sourceBucket + sourceFilename;
  headers['Content-Length'] = 0; // to avoid Node's automatic chunking if omitted
  return headers;
}


/**
 * Initialize a `Client` with the given `options`.
 *
 * Required:
 *
 *  - `key`     amazon api key
 *  - `secret`  amazon secret
 *  - `bucket`  bucket name string, ex: "learnboost"
 *
 * @param {Object} options
 * @api public
 */

var Client = module.exports = exports = function Client(options) {
  if (!options.key) throw new Error('aws "key" required');
  if (!options.secret) throw new Error('aws "secret" required');
  if (!options.bucket) throw new Error('aws "bucket" required');

  if (options.style && options.style !== 'virtualHosted' &&
      options.style !== 'path') {
    throw new Error('style must be "virtualHosted" or "path"');
  }

  if (options.port !== undefined && isNaN(parseInt(options.port))) {
    throw new Error('port must be a number.');
  }

  var invalidness = isInvalid(options.bucket);
  var dnsUncompliance = isNotDnsCompliant(options.bucket);

  if (invalidness) {
    throw new Error('Bucket name "' + options.bucket + '" ' + invalidness + '.');
  }

  // Save original options, we will need them for Client#copyTo
  this.options = utils.merge({}, options);

  // Make sure we don't override options the user passes in.
  options = utils.merge({}, options);
  autoDetermineStyle(options);

  if (!options.endpoint) {
    if (!options.region || options.region === 'us-standard' || options.region === 'us-east-1') {
      options.endpoint = 's3.amazonaws.com';
      options.region = 'us-standard';
    } else {
      options.endpoint = 's3-' + options.region + '.amazonaws.com';
    }

    if (options.region !== 'us-standard') {
      if (dnsUncompliance) {
        throw new Error('Outside of the us-standard region, bucket names must' +
                        ' be DNS-compliant. The name "' + options.bucket +
                        '" ' + dnsUncompliance + '.');
      }
    }
  } else {
    options.region = undefined;
  }

  var portSuffix = 'undefined' == typeof options.port ? "" : ":" + options.port;
  this.secure = 'undefined' == typeof options.port;

  if (options.style === 'virtualHosted') {
    this.host = options.bucket + '.' + options.endpoint;
    this.urlBase = options.bucket + '.' + options.endpoint + portSuffix;
  } else {
    this.host = options.endpoint;
    this.urlBase = options.endpoint + portSuffix + '/' + options.bucket;
  }

  // HTTP in Node.js < 0.12 is horribly broken, and leads to lots of "socket
  // hang up" errors: https://github.com/LearnBoost/knox/issues/116. See
  // https://github.com/LearnBoost/knox/issues/116#issuecomment-15045187 and
  // https://github.com/substack/hyperquest#rant
  this.agent = false;

  utils.merge(this, options);

  this.url = this.secure ? this.https : this.http;
};

/**
 * Request with `filename` the given `method`, and optional `headers`.
 *
 * @param {String} method
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api private
 */

Client.prototype.request = function(method, filename, headers){
  var options = { hostname: this.host, agent: this.agent, port: this.port }
    , date = new Date
    , headers = headers || {}
    , fixedFilename = encodeSpecialCharacters(ensureLeadingSlash(filename));

  // Default headers
  headers.Date = date.toUTCString()
  if (this.style === 'virtualHosted') {
    headers.Host = this.host;
  }

  if ('undefined' != typeof this.token)
    headers['x-amz-security-token'] = this.token;

  // Authorization header
  headers.Authorization = auth.authorization({
      key: this.key
    , secret: this.secret
    , verb: method
    , date: date
    , resource: auth.canonicalizeResource('/' + this.bucket + fixedFilename)
    , contentType: getHeader(headers, 'content-type')
    , md5: getHeader(headers, 'content-md5') || ''
    , amazonHeaders: auth.canonicalizeHeaders(headers)
  });

  var pathPrefix = this.style === 'path' ? '/' + this.bucket : '';

  // Issue request
  options.method = method;
  options.path = pathPrefix + fixedFilename;
  options.headers = headers;
  var req = (this.secure ? https : http).request(options);
  req.url = this.url(filename);
  debug('%s %s', method, req.url);

  return req;
};

/**
 * PUT data to `filename` with optional `headers`.
 *
 * Example:
 *
 *     // Fetch the size
 *     fs.stat('Readme.md', function(err, stat){
 *      // Create our request
 *      var req = client.put('/test/Readme.md', {
 *          'Content-Length': stat.size
 *        , 'Content-Type': 'text/plain'
 *      });
 *      fs.readFile('Readme.md', function(err, buf){
 *        // Output response
 *        req.on('response', function(res){
 *          console.log(res.statusCode);
 *          console.log(res.headers);
 *          res.pipe(fs.createWriteStream('Readme.md'));
 *        });
 *        // Send the request with the file's Buffer obj
 *        req.end(buf);
 *      });
 *     });
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.put = function(filename, headers){
  headers = utils.merge({
      Expect: '100-continue'
  }, headers || {});
  return this.request('PUT', filename, headers);
};

/**
 * PUT the file at `src` to `filename`, with callback `fn`
 * receiving a possible exception, and the response object.
 *
 * Example:
 *
 *    client
 *     .putFile('package.json', '/test/package.json', function(err, res){
 *       if (err) throw err;
 *       console.log(res.statusCode);
 *       console.log(res.headers);
 *     });
 *
 * @param {String} src
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @return {EventEmitter}
 * @api public
 */

Client.prototype.putFile = function(src, filename, headers, fn){
  var self = this;
  var emitter = new Emitter;

  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  debug('put %s', src);
  fs.stat(src, function (err, stat) {
    if (err) return fn(err);

    var contentType = mime.lookup(src);

    // Add charset if it's known.
    var charset = mime.charsets.lookup(contentType);
    if (charset) {
      contentType += '; charset=' + charset;
    }

    headers = utils.merge({
        'Content-Length': stat.size
      , 'Content-Type': contentType
    }, headers);

    var stream = fs.createReadStream(src);

    var fnCalled = false;
    function wrappedFn(err, result) {
      if (fnCalled) {
        if (err) {
          emitter.emit('error', err);
        }
      } else {
        fnCalled = true;
        fn(err, result);
      }
    }
    var req = self.putStream(stream, filename, headers, wrappedFn);

    req.on('progress', emitter.emit.bind(emitter, 'progress'));
    req.on('error', wrappedFn);
  });

  return emitter;
};

/**
 * PUT the given `stream` as `filename` with `headers`.
 * `headers` must contain `'Content-Length'` at least.
 *
 * @param {Stream} stream
 * @param {String} filename
 * @param {Object} headers
 * @param {Function} fn
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.putStream = function(stream, filename, headers, fn){
  var contentLength = getHeader(headers, 'content-length');
  if (contentLength === null) {
    process.nextTick(function () {
      fn(new Error('You must specify a Content-Length header.'));
    });
    return;
  }

  var self = this;
  var req = self.put(filename, headers);

  registerReqListeners(req, fn);
  stream.on('error', fn);


  var counter = new StreamCounter();
  counter.on('progress', function(){
    req.emit('progress', {
        percent: counter.bytes / contentLength * 100 | 0
      , written: counter.bytes
      , total: contentLength
    });
  });

  stream.pipe(counter);
  stream.pipe(req);
  return req;
};

/**
 * PUT the given `buffer` as `filename` with optional `headers`.
 * Callback `fn` receives a possible exception and the response object.
 *
 * @param {Buffer} buffer
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.putBuffer = function(buffer, filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  headers['Content-Length'] = buffer.length;

  var req = this.put(filename, headers);
  registerReqListeners(req, fn);
  req.end(buffer);
  return req;
};

/**
 * Copy files from `sourceFilename` to `destFilename` with optional `headers`.
 *
 * @param {String} sourceFilename
 * @param {String} destFilename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.copy = function(sourceFilename, destFilename, headers){
  return this.put(destFilename, getCopyHeaders(this.bucket, sourceFilename, headers));
};

/**
 * Copy files from `sourceFilename` to `destFilename` with optional `headers`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} sourceFilename
 * @param {String} destFilename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.copyFile = function(sourceFilename, destFilename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  var req = this.copy(sourceFilename, destFilename, headers);
  registerReqListeners(req, fn);
  req.end();
  return req;
};

/**
 * Copy files from `sourceFilename` to `destFilename` of the bucket `destBucket`
 * with optional `headers`.
 *
 * @param {String} sourceFilename
 * @param {String|Object} destBucket
 * @param {String} destFilename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.copyTo = function(sourceFilename, destBucket, destFilename, headers){
  var options = utils.merge({}, this.options);
  if (typeof destBucket == 'string') {
    options.bucket = destBucket;
  } else {
    utils.merge(options, destBucket);
  }
  var client = exports.createClient(options);
  return client.put(destFilename, getCopyHeaders(this.bucket, sourceFilename, headers));
};

/**
 * Copy file from `sourceFilename` to `destFilename` of the bucket `destBucket
 * with optional `headers` and callback `fn` with a possible exception and the response.
 *
 * @param {String} sourceFilename
 * @param {String} destBucket
 * @param {String} destFilename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.copyFileTo = function(sourceFilename, destBucket, destFilename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  var req = this.copyTo(sourceFilename, destBucket, destFilename, headers);
  registerReqListeners(req, fn);
  req.end();
  return req;
};

/**
 * GET `filename` with optional `headers`.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.get = function(filename, headers){
  return this.request('GET', filename, headers);
};

/**
 * GET `filename` with optional `headers` and callback `fn`
 * with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.getFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  var req = this.get(filename, headers);
  registerReqListeners(req, fn);
  req.end();
  return req;
};

/**
 * Issue a HEAD request on `filename` with optional `headers.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.head = function(filename, headers){
  return this.request('HEAD', filename, headers);
};

/**
 * Issue a HEAD request on `filename` with optional `headers`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.headFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  var req = this.head(filename, headers);
  registerReqListeners(req, fn);
  req.end();
  return req;
};

/**
 * DELETE `filename` with optional `headers.
 *
 * @param {String} filename
 * @param {Object} headers
 * @return {ClientRequest}
 * @api public
 */

Client.prototype.del = function(filename, headers){
  return this.request('DELETE', filename, headers);
};

/**
 * DELETE `filename` with optional `headers`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {String} filename
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.deleteFile = function(filename, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }
  var req = this.del(filename, headers);
  registerReqListeners(req, fn);
  req.end();
};

function xmlEscape(string) {
  return string
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeDeleteXmlBuffer(keys) {
    var tags = keys.map(function(key){
      return '<Object><Key>' +
        xmlEscape(removeLeadingSlash(key)) +
        '</Key></Object>';
    });
    return new Buffer('<?xml version="1.0" encoding="UTF-8"?>' +
      '<Delete>' + tags.join('') + '</Delete>', 'utf8');
}

/**
 * Delete up to 1000 files at a time, with optional `headers`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {Array[String]} filenames
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.deleteMultiple = function(filenames, headers, fn){
  if (filenames.length > BUCKET_OPS_MAX) {
    throw new Error('Can only delete up to ' + BUCKET_OPS_MAX + ' files ' +
      'at a time. You\'ll need to batch them.');
  }

  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  var xml = makeDeleteXmlBuffer(filenames);

  headers['Content-Length'] = xml.length;
  headers['Content-MD5'] = crypto.createHash('md5').update(xml).digest('base64');

  return this.request('POST', '/?delete', headers)
    .on('response', function(res){
      fn(null, res);
    })
    .on('error', function(err){
      fn(err);
    })
    .end(xml);
};

/**
 * Possible params for Client#list.
 *
 * @type {Object}
 */

var LIST_PARAMS = {
    delimiter: true
  , marker: true
  ,'max-keys': true
  , prefix: true
};

/**
 * Normalization map for Client#list.
 *
 * @type {Object}
 */

var RESPONSE_NORMALIZATION = {
    MaxKeys: Number,
    IsTruncated: Boolean,
    LastModified: Date,
    Size: Number,
    Contents: Array,
    CommonPrefixes: Array
};

/**
 * Convert data we get from S3 xml in Client#list, since every primitive
 * value there is a string.
 *
 * @type {Object}
 */

function normalizeResponse(data) {
  for (var key in data) {
    var Constr = RESPONSE_NORMALIZATION[key];

    if (Constr) {
      if (Constr === Date) {
        data[key] = new Date(data[key]);
      } else if (Constr === Array) {
        // If there's only one element in the array xml2js doesn't know that
        // it should be an array; array-ify it.
        if (!Array.isArray(data[key])) {
          data[key] = [data[key]];
        }
      } else if (Constr === Boolean) {
        data[key] = data[key] === 'true';
      } else {
        data[key] = Constr(data[key]);
      }
    }

    if (Array.isArray(data[key])) {
      data[key].forEach(normalizeResponse);
    }
  }
}

/**
 * List up to 1000 objects at a time, with optional `headers`, `params`
 * and callback `fn` with a possible exception and the response.
 *
 * @param {Object|Function} params
 * @param {Object|Function} headers
 * @param {Function} fn
 * @api public
 */

Client.prototype.list = function(params, headers, fn){
  if ('function' == typeof headers) {
    fn = headers;
    headers = {};
  }

  if ('function' == typeof params) {
    fn = params;
    params = null;
  }

  if (params && !LIST_PARAMS[Object.keys(params)[0]]) {
    headers = params;
    params = null;
  }

  // Stringify the list params but don't encode them yet, since ::request
  // already encodes the value, leading to double-encoding issues
  var url = params ? '?' + decodeURIComponent(qs.stringify(params)) : '';

  return this.getFile(url, headers, function(err, res){
    if (err) return fn(err);

    var xmlStr = '';

    res.on('data', function(chunk){
      xmlStr += chunk;
    });

    res.on('end', function(){
      new xml2js.Parser({explicitArray: false, explicitRoot: false})
        .parseString(xmlStr, function(err, data){
          if (err) return fn(err);
          if (data == null) return fn(new Error('null response received'));
          
          delete data.$;
          normalizeResponse(data);

          if (!('Contents' in data)) {
            data.Contents = [];
          }

          fn(null, data);
        });
    }).on('error', fn);
  });
};

/**
 * Return a url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.http = function(filename){
  filename = encodeSpecialCharacters(ensureLeadingSlash(filename));

  return 'http://' + this.urlBase + filename;
};

/**
 * Return an HTTPS url to the given `filename`.
 *
 * @param {String} filename
 * @return {String}
 * @api public
 */

Client.prototype.https = function(filename){
  filename = encodeSpecialCharacters(ensureLeadingSlash(filename));

  return 'https://' + this.urlBase + filename;
};

/**
 * Return an S3 presigned url to the given `filename`.
 *
 * @param {String} filename
 * @param {Date} expiration
 * @param {Object} options: can take verb, contentType, and qs object
 * @return {String}
 * @api public
 */

Client.prototype.signedUrl = function(filename, expiration, options){
  var epoch = Math.floor(expiration.getTime()/1000)
    , pathname = url.parse(filename).pathname
    , resource = '/' + this.bucket + ensureLeadingSlash(pathname);

  if (options && options.qs) {
    resource += '?' + decodeURIComponent(qs.stringify(options.qs));
  }

  var signature = auth.signQuery({
      secret: this.secret
    , date: epoch
    , resource: resource
    , verb: (options && options.verb) || 'GET'
    , contentType: options && options.contentType
    , token: this.token
  });

  var queryString = qs.stringify(utils.merge({
    Expires: epoch,
    AWSAccessKeyId: this.key,
    Signature: signature
  }, (options && options.qs) || {}));

  if (typeof this.token !== 'undefined')
      queryString += '&x-amz-security-token=' + encodeURIComponent(this.token);

  return this.url(filename) + '?' + queryString;
};

/**
 * Shortcut for `new Client()`.
 *
 * @param {Object} options
 * @see Client()
 * @api public
 */

exports.createClient = function(options){
  return new Client(options);
};
