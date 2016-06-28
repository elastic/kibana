(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports", 'http', 'https', '../kernel', '../Promise', 'url'], function (require, exports) {
    var http = require('http');
    var https = require('https');
    var kernel = require('../kernel');
    var Promise = require('../Promise');
    var urlUtil = require('url');
    function normalizeHeaders(headers) {
        var normalizedHeaders = {};
        for (var key in headers) {
            normalizedHeaders[key.toLowerCase()] = headers[key];
        }
        return normalizedHeaders;
    }
    function node(url, options) {
        if (options === void 0) { options = {}; }
        var deferred = new Promise.Deferred(function (reason) {
            request && request.abort();
            throw reason;
        });
        var promise = deferred.promise;
        var parsedUrl = urlUtil.parse(options.proxy || url);
        var requestOptions = {
            agent: options.agent,
            auth: parsedUrl.auth || options.auth,
            ca: options.ca,
            cert: options.cert,
            ciphers: options.ciphers,
            headers: normalizeHeaders(options.headers || {}),
            host: parsedUrl.host,
            hostname: parsedUrl.hostname,
            key: options.key,
            localAddress: options.localAddress,
            method: options.method ? options.method.toUpperCase() : 'GET',
            passphrase: options.passphrase,
            path: parsedUrl.path,
            pfx: options.pfx,
            port: +parsedUrl.port,
            rejectUnauthorized: options.rejectUnauthorized,
            secureProtocol: options.secureProtocol,
            socketPath: options.socketPath
        };
        if (!('user-agent' in requestOptions.headers)) {
            requestOptions.headers['user-agent'] = 'dojo/' + kernel.version + ' Node.js/' + process.version.replace(/^v/, '');
        }
        if (options.proxy) {
            requestOptions.path = url;
            if (parsedUrl.auth) {
                requestOptions.headers['proxy-authorization'] = 'Basic ' + new Buffer(parsedUrl.auth).toString('base64');
            }
            (function () {
                var parsedUrl = urlUtil.parse(url);
                requestOptions.headers['host'] = parsedUrl.host;
                requestOptions.auth = parsedUrl.auth || options.auth;
            })();
        }
        if (!options.auth && (options.user || options.password)) {
            requestOptions.auth = encodeURIComponent(options.user || '') + ':' + encodeURIComponent(options.password || '');
        }
        var request = (parsedUrl.protocol === 'https:' ? https : http).request(requestOptions);
        var response = {
            data: null,
            getHeader: function (name) {
                return (this.nativeResponse && this.nativeResponse.headers[name.toLowerCase()]) || null;
            },
            requestOptions: options,
            statusCode: null,
            url: url
        };
        if (options.socketOptions) {
            if ('timeout' in options.socketOptions) {
                request.setTimeout(options.socketOptions.timeout);
            }
            if ('noDelay' in options.socketOptions) {
                request.setNoDelay(options.socketOptions.noDelay);
            }
            if ('keepAlive' in options.socketOptions) {
                var initialDelay = options.socketOptions.keepAlive;
                request.setSocketKeepAlive(initialDelay >= 0, initialDelay || 0);
            }
        }
        request.once('response', function (nativeResponse) {
            var data;
            var loaded = 0;
            var total = +nativeResponse.headers['content-length'];
            response.nativeResponse = nativeResponse;
            response.statusCode = nativeResponse.statusCode;
            if (response.statusCode >= 300 && response.statusCode < 400 && response.statusCode !== 304 &&
                options.followRedirects !== false &&
                nativeResponse.headers.location) {
                if (nativeResponse.headers.location === url &&
                    (response.statusCode !== 303 || requestOptions.method === 'GET')) {
                    deferred.reject(new Error('Redirect loop detected for URL ' + url));
                    return;
                }
                deferred.progress({
                    type: 'redirect',
                    location: nativeResponse.headers.location,
                    response: nativeResponse
                });
                deferred.resolve(node(nativeResponse.headers.location, options));
                return;
            }
            if (!options.streamData) {
                data = [];
            }
            options.streamEncoding && nativeResponse.setEncoding(options.streamEncoding);
            if (options.streamTarget) {
                nativeResponse.pipe(options.streamTarget);
                options.streamTarget.once('error', function (error) {
                    nativeResponse.unpipe(options.streamTarget);
                    request.abort();
                    error.response = response;
                    deferred.reject(error);
                });
                options.streamTarget.once('close', function () {
                    deferred.resolve(response);
                });
            }
            nativeResponse.on('data', function (chunk) {
                options.streamData || data.push(chunk);
                loaded += typeof chunk === 'string' ? Buffer.byteLength(chunk, options.streamEncoding) : chunk.length;
                deferred.progress({ type: 'data', chunk: chunk, loaded: loaded, total: total });
            });
            nativeResponse.once('end', function () {
                timeout && timeout.remove();
                if (!options.streamData) {
                    response.data = options.streamEncoding ? data.join('') : Buffer.concat(data, loaded);
                }
                if (!options.streamTarget) {
                    deferred.resolve(response);
                }
            });
            deferred.progress({ type: 'nativeResponse', response: nativeResponse });
        });
        request.once('error', deferred.reject);
        if (options.data) {
            if (options.data.pipe) {
                options.data.pipe(request);
            }
            else {
                request.end(options.data, options.dataEncoding);
            }
        }
        else {
            request.end();
        }
        if (options.timeout > 0 && options.timeout !== Infinity) {
            var timeout = (function () {
                var timer = setTimeout(function () {
                    var error = new Error('Request timed out after ' + options.timeout + 'ms');
                    error.name = 'RequestTimeoutError';
                    promise.cancel(error);
                }, options.timeout);
                return {
                    remove: function () {
                        this.remove = function () { };
                        clearTimeout(timer);
                    }
                };
            })();
        }
        return promise.catch(function (error) {
            var parsedUrl = urlUtil.parse(url);
            if (parsedUrl.auth) {
                parsedUrl.auth = '(redacted)';
            }
            var sanitizedUrl = urlUtil.format(parsedUrl);
            error.message = '[' + requestOptions.method + ' ' + sanitizedUrl + '] ' + error.message;
            throw error;
        });
    }
    return node;
});
//# sourceMappingURL=../_debug/request/node.js.map