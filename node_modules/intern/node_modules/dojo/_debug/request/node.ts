import core = require('../interfaces');
import http = require('http');
import https = require('https');
import kernel = require('../kernel');
import Promise = require('../Promise');
import request = require('../request');
import urlUtil = require('url');

interface IOptions {
	agent?: any;
	auth?: string;
	headers?: { [name: string]: string; };
	host?: string;
	hostname?: string;
	localAddress?: string;
	method?: string;
	path?: string;
	port?: number;
	socketPath?: string;
}

interface IHttpsOptions extends IOptions {
	ca?: any;
	cert?: string;
	ciphers?: string;
	key?: string;
	passphrase?: string;
	pfx?: any;
	rejectUnauthorized?: boolean;
	secureProtocol?: string;
}

module node {
	export interface INodeRequestOptions extends request.IRequestOptions {
		agent?: any;
		ca?: any;
		cert?: string;
		ciphers?: string;
		dataEncoding?: string;
		followRedirects?: boolean;
		key?: string;
		localAddress?: string;
		passphrase?: string;
		pfx?: any;
		proxy?: string;
		rejectUnauthorized?: boolean;
		secureProtocol?: string;
		socketPath?: string;
		socketOptions?: {
			keepAlive?: number;
			noDelay?: boolean;
			timeout?: number;
		};
		streamData?: boolean;
		streamEncoding?: string;
		streamTarget?: any;
	}
}

function normalizeHeaders(headers: { [name: string]: string; }): { [name: string]: string; } {
	var normalizedHeaders: { [name: string]: string; } = {};
	for (var key in headers) {
		normalizedHeaders[key.toLowerCase()] = headers[key];
	}

	return normalizedHeaders;
}

function node(url: string, options: node.INodeRequestOptions = {}): Promise<request.IResponse> {
	var deferred: Promise.Deferred<request.IResponse> = new Promise.Deferred(function (reason: Error): void {
		request && request.abort();
		throw reason;
	});
	var promise: request.IRequestPromise = <request.IRequestPromise> deferred.promise;
	var parsedUrl: urlUtil.Url = urlUtil.parse(options.proxy || url);

	var requestOptions: IHttpsOptions = {
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

		(function (): void {
			var parsedUrl: urlUtil.Url = urlUtil.parse(url);
			requestOptions.headers['host'] = parsedUrl.host;
			requestOptions.auth = parsedUrl.auth || options.auth;
		})();
	}

	if (!options.auth && (options.user || options.password)) {
		requestOptions.auth = encodeURIComponent(options.user || '') + ':' + encodeURIComponent(options.password || '');
	}

	// TODO: Cast to `any` prevents TS2226 error
	var request: http.ClientRequest = (parsedUrl.protocol === 'https:' ? <any> https : http).request(requestOptions);
	var response: request.IResponse = {
		data: null,
		getHeader: function (name: string): string {
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
			var initialDelay: number = options.socketOptions.keepAlive;
			request.setSocketKeepAlive(initialDelay >= 0, initialDelay || 0);
		}
	}

	request.once('response', function (nativeResponse: http.ClientResponse): void {
		var data: any[];
		var loaded: number = 0;
		var total: number = +nativeResponse.headers['content-length'];

		response.nativeResponse = nativeResponse;
		response.statusCode = nativeResponse.statusCode;

		// Redirection handling defaults to true in order to harmonise with the XHR provider, which will always
		// follow redirects
		// TODO: This redirect code is not 100% correct according to the RFC; needs to handle redirect loops
		// A -> B -> A and restrict/modify certain redirects
		if (
			response.statusCode >= 300 && response.statusCode < 400 && response.statusCode !== 304 &&
			options.followRedirects !== false &&
			nativeResponse.headers.location
		) {
			if (
				nativeResponse.headers.location === url &&
				// 303 asks the UA to convert method to GET so is only a loop if the method was already GET
				(response.statusCode !== 303 || requestOptions.method === 'GET')
			) {
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
			options.streamTarget.once('error', function (error: request.IRequestError): void {
				nativeResponse.unpipe(options.streamTarget);
				request.abort();
				error.response = response;
				deferred.reject(error);
			});
			options.streamTarget.once('close', function (): void {
				deferred.resolve(response);
			});
		}

		nativeResponse.on('data', function (chunk: any): void {
			options.streamData || data.push(chunk);
			loaded += typeof chunk === 'string' ? Buffer.byteLength(chunk, options.streamEncoding) : chunk.length;
			deferred.progress({ type: 'data', chunk: chunk, loaded: loaded, total: total });
		});

		nativeResponse.once('end', function (): void {
			timeout && timeout.remove();

			if (!options.streamData) {
				response.data = options.streamEncoding ? data.join('') : Buffer.concat(data, loaded);
			}

			// If using a streamTarget, wait for it to finish in case it throws an error
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
		var timeout: core.IHandle = (function (): core.IHandle {
			var timer = setTimeout(function (): void {
				var error = new Error('Request timed out after ' + options.timeout + 'ms');
				error.name = 'RequestTimeoutError';
				promise.cancel(error);
			}, options.timeout);

			return {
				remove: function (): void {
					this.remove = function (): void {};
					clearTimeout(timer);
				}
			};
		})();
	}

	return promise.catch(function (error: Error): any {
		var parsedUrl: urlUtil.UrlOptions = urlUtil.parse(url);

		if (parsedUrl.auth) {
			parsedUrl.auth = '(redacted)';
		}

		var sanitizedUrl: string = urlUtil.format(parsedUrl);

		error.message = '[' + requestOptions.method + ' ' + sanitizedUrl + '] ' + error.message;

		throw error;
	});
}

export = node;
