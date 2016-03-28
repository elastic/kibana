import Promise = require('../Promise');
import request = require('../request');

module xhr {
	export interface IRequestOptions extends request.IRequestOptions {
		blockMainThread?: boolean;
	}

	export interface IResponse extends request.IResponse {
		statusText: string;
	}
}

function xhr(url: string, options: xhr.IRequestOptions = {}): Promise<xhr.IResponse> {
	var deferred: Promise.Deferred<xhr.IResponse> = new Promise.Deferred(function (reason: Error): void {
		request && request.abort();
		throw reason;
	});

	var request = new XMLHttpRequest();
	var response: xhr.IResponse = {
		data: null,
		getHeader: function (name: string): string {
			return request.getResponseHeader(name);
		},
		nativeResponse: request,
		requestOptions: options,
		statusCode: null,
		statusText: null,
		url: url
	};

	if ((!options.user || !options.password) && options.auth) {
		(function (): void {
			var auth: string[] = options.auth.split(':');
			options.user = decodeURIComponent(auth[0]);
			options.password = decodeURIComponent(auth[1]);
		})();
	}

	request.open(options.method, url, !options.blockMainThread, options.user, options.password);

	request.onerror = function (event: ErrorEvent): void {
		deferred.reject(event.error);
	};

	request.onload = function (): void {
		if (options.responseType === 'xml') {
			response.data = request.responseXML;
		}
		else {
			response.data = request.response;
		}

		response.statusCode = request.status;
		response.statusText = request.statusText;

		deferred.resolve(response);
	};

	request.onprogress = function (event: ProgressEvent): void {
		deferred.progress(event);
	};

	if (options.timeout > 0 && options.timeout !== Infinity) {
		request.timeout = options.timeout;
	}

	for (var header in options.headers) {
		request.setRequestHeader(header, options.headers[header]);
	}

	request.send(options.data);

	return deferred.promise;
}

export = xhr;
