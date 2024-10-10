"use strict";
/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License") you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/promise-function-async */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
const assert_1 = tslib_1.__importDefault(require("assert"));
const util_1 = require("util");
const stream_1 = require("stream");
const transport_1 = require("@elastic/transport");
const { ResponseError, ConfigurationError } = transport_1.errors;
const sleep = (0, util_1.promisify)(setTimeout);
const pImmediate = (0, util_1.promisify)(setImmediate);
/* istanbul ignore next */
const noop = () => { };
const kClient = Symbol('elasticsearch-client');
const kMetaHeader = Symbol('meta header');
const kMaxRetries = Symbol('max retries');
class Helpers {
    constructor(opts) {
        Object.defineProperty(this, _a, {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, _b, {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, _c, {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this[kClient] = opts.client;
        this[kMetaHeader] = opts.metaHeader;
        this[kMaxRetries] = opts.maxRetries;
    }
    /**
     * Runs a search operation. The only difference between client.search and this utility,
     * is that we are only returning the hits to the user and not the full ES response.
     * This helper automatically adds `filter_path=hits.hits._source` to the querystring,
     * as it will only need the documents source.
     * @param {object} params - The Elasticsearch's search parameters.
     * @param {object} options - The client optional configuration for this request.
     * @return {array} The documents that matched the request.
     */
    async search(params, options = {}) {
        var _d;
        appendFilterPath('hits.hits._source', params, true);
        options.meta = true;
        const { body: result } = await this[kClient].search(params, options);
        if (((_d = result.hits) === null || _d === void 0 ? void 0 : _d.hits) != null) {
            return result.hits.hits.map(d => d._source);
        }
        return [];
    }
    /**
     * Runs a scroll search operation. This function returns an async iterator, allowing
     * the user to use a for await loop to get all the results of a given search.
     * ```js
     * for await (const result of client.helpers.scrollSearch({ params })) {
     *   console.log(result)
     * }
     * ```
     * Each result represents the entire body of a single scroll search request,
     * if you just need to scroll the results, use scrollDocuments.
     * This function handles automatically retries on 429 status code.
     * @param {object} params - The Elasticsearch's search parameters.
     * @param {object} options - The client optional configuration for this request.
     * @return {iterator} the async iterator
     */
    async *scrollSearch(params, options = {}) {
        var _d, _e, _f, _g;
        options.meta = true;
        if (this[kMetaHeader] !== null) {
            options.headers = (_d = options.headers) !== null && _d !== void 0 ? _d : {};
            options.headers['x-elastic-client-meta'] = `${this[kMetaHeader]},h=s`;
        }
        const wait = (_e = options.wait) !== null && _e !== void 0 ? _e : 5000;
        const maxRetries = (_f = options.maxRetries) !== null && _f !== void 0 ? _f : this[kMaxRetries];
        if (Array.isArray(options.ignore)) {
            options.ignore.push(429);
        }
        else {
            options.ignore = [429];
        }
        params.scroll = (_g = params.scroll) !== null && _g !== void 0 ? _g : '1m';
        appendFilterPath('_scroll_id', params, false);
        let response;
        for (let i = 0; i <= maxRetries; i++) {
            response = await this[kClient].search(params, options);
            if (response.statusCode !== 429)
                break;
            await sleep(wait);
        }
        (0, assert_1.default)(response !== undefined, 'The response is undefined, please file a bug report');
        const { redaction = { type: 'replace' } } = options;
        const errorOptions = { redaction };
        if (response.statusCode === 429) {
            throw new ResponseError(response, errorOptions);
        }
        let scroll_id = response.body._scroll_id;
        let stop = false;
        const clear = async () => {
            stop = true;
            await this[kClient].clearScroll({ scroll_id }, { ignore: [400], ...options });
        };
        while (response.body.hits != null && response.body.hits.hits.length > 0) {
            // scroll id is always present in the response, but it might
            // change over time based on the number of shards
            scroll_id = response.body._scroll_id;
            // @ts-expect-error
            response.clear = clear;
            addDocumentsGetter(response);
            // @ts-expect-error
            yield response;
            if (stop) {
                break;
            }
            for (let i = 0; i <= maxRetries; i++) {
                const r = await this[kClient].scroll({
                    scroll: params.scroll,
                    rest_total_hits_as_int: params.rest_total_hits_as_int,
                    scroll_id
                }, options);
                response = r;
                (0, assert_1.default)(response !== undefined, 'The response is undefined, please file a bug report');
                if (response.statusCode !== 429)
                    break;
                await sleep(wait);
            }
            if (response.statusCode === 429) {
                throw new ResponseError(response, errorOptions);
            }
        }
        if (!stop) {
            await clear();
        }
    }
    /**
     * Runs a scroll search operation. This function returns an async iterator, allowing
     * the user to use a for await loop to get all the documents of a given search.
     * ```js
     * for await (const document of client.helpers.scrollSearch({ params })) {
     *   console.log(document)
     * }
     * ```
     * Each document is what you will find by running a scrollSearch and iterating on the hits array.
     * This helper automatically adds `filter_path=hits.hits._source` to the querystring,
     * as it will only need the documents source.
     * @param {object} params - The Elasticsearch's search parameters.
     * @param {object} options - The client optional configuration for this request.
     * @return {iterator} the async iterator
     */
    async *scrollDocuments(params, options = {}) {
        appendFilterPath('hits.hits._source', params, true);
        for await (const { documents } of this.scrollSearch(params, options)) {
            for (const document of documents) {
                yield document;
            }
        }
    }
    /**
     * Creates a msearch helper instance. Once you configure it, you can use the provided
     * `search` method to add new searches in the queue.
     * @param {object} options - The configuration of the msearch operations.
     * @param {object} reqOptions - The client optional configuration for this request.
     * @return {object} The possible operations to run.
     */
    msearch(options = {}, reqOptions = {}) {
        const client = this[kClient];
        const { operations = 5, concurrency = 5, flushInterval = 500, retries = this[kMaxRetries], wait = 5000, ...msearchOptions } = options;
        reqOptions.meta = true;
        const { redaction = { type: 'replace' } } = reqOptions;
        const errorOptions = { redaction };
        let stopReading = false;
        let stopError = null;
        let timeoutRef = null;
        const operationsStream = new stream_1.Readable({
            objectMode: true,
            read(size) { }
        });
        const p = iterate();
        const helper = {
            [Symbol.toStringTag]: 'Promise',
            then(onFulfilled, onRejected) {
                return p.then(onFulfilled, onRejected);
            },
            catch(onRejected) {
                return p.catch(onRejected);
            },
            finally(onFinally) {
                return p.finally(onFinally);
            },
            stop(error = null) {
                if (stopReading)
                    return;
                stopReading = true;
                stopError = error;
                operationsStream.push(null);
            },
            // TODO: support abort a single search?
            // NOTE: the validation checks are synchronous and the callback/promise will
            //       be resolved in the same tick. We might want to fix this in the future.
            search(header, body) {
                if (stopReading) {
                    const error = stopError === null
                        ? new ConfigurationError('The msearch processor has been stopped')
                        : stopError;
                    return Promise.reject(error);
                }
                if (!(typeof header === 'object' && header !== null && !Array.isArray(header))) {
                    return Promise.reject(new ConfigurationError('The header should be an object'));
                }
                if (!(typeof body === 'object' && body !== null && !Array.isArray(body))) {
                    return Promise.reject(new ConfigurationError('The body should be an object'));
                }
                let onFulfilled = null;
                let onRejected = null;
                const promise = new Promise((resolve, reject) => {
                    onFulfilled = resolve;
                    onRejected = reject;
                });
                const callback = function callback(err, result) {
                    err !== null ? onRejected(err) : onFulfilled(result);
                };
                operationsStream.push([header, body, callback]);
                return promise;
            }
        };
        return helper;
        async function iterate() {
            const { semaphore, finish } = buildSemaphore();
            const msearchBody = [];
            const callbacks = [];
            let loadedOperations = 0;
            timeoutRef = setTimeout(onFlushTimeout, flushInterval); // eslint-disable-line
            try {
                for await (const operation of operationsStream) {
                    timeoutRef.refresh();
                    loadedOperations += 1;
                    msearchBody.push(operation[0], operation[1]);
                    callbacks.push(operation[2]);
                    if (loadedOperations >= operations) {
                        const send = await semaphore();
                        send(msearchBody.slice(), callbacks.slice());
                        msearchBody.length = 0;
                        callbacks.length = 0;
                        loadedOperations = 0;
                    }
                }
            }
            finally {
                clearTimeout(timeoutRef);
            }
            // In some cases the previos http call does not have finished,
            // or we didn't reach the flush bytes threshold, so we force one last operation.
            if (loadedOperations > 0) {
                const send = await semaphore();
                send(msearchBody, callbacks);
            }
            await finish();
            if (stopError !== null) {
                throw stopError;
            }
            async function onFlushTimeout() {
                if (loadedOperations === 0)
                    return;
                const msearchBodyCopy = msearchBody.slice();
                const callbacksCopy = callbacks.slice();
                msearchBody.length = 0;
                callbacks.length = 0;
                loadedOperations = 0;
                try {
                    const send = await semaphore();
                    send(msearchBodyCopy, callbacksCopy);
                }
                catch (err) {
                    /* istanbul ignore next */
                    // @ts-expect-error
                    helper.stop(err);
                }
            }
        }
        // This function builds a semaphore using the concurrency
        // options of the msearch helper. It is used inside the iterator
        // to guarantee that no more than the number of operations
        // allowed to run at the same time are executed.
        // It returns a semaphore function which resolves in the next tick
        // if we didn't reach the maximim concurrency yet, otherwise it returns
        // a promise that resolves as soon as one of the running request has finshed.
        // The semaphore function resolves a send function, which will be used
        // to send the actual msearch request.
        // It also returns a finish function, which returns a promise that is resolved
        // when there are no longer request running.
        function buildSemaphore() {
            let resolveSemaphore = null;
            let resolveFinish = null;
            let running = 0;
            return { semaphore, finish };
            function finish() {
                return new Promise((resolve, reject) => {
                    if (running === 0) {
                        resolve();
                    }
                    else {
                        resolveFinish = resolve;
                    }
                });
            }
            function semaphore() {
                if (running < concurrency) {
                    running += 1;
                    return pImmediate(send);
                }
                else {
                    return new Promise((resolve, reject) => {
                        resolveSemaphore = resolve;
                    });
                }
            }
            function send(msearchBody, callbacks) {
                /* istanbul ignore if */
                if (running > concurrency) {
                    throw new Error('Max concurrency reached');
                }
                msearchOperation(msearchBody, callbacks, () => {
                    running -= 1;
                    if (resolveSemaphore !== null) {
                        running += 1;
                        resolveSemaphore(send);
                        resolveSemaphore = null;
                    }
                    else if (resolveFinish != null && running === 0) {
                        resolveFinish();
                    }
                });
            }
        }
        function msearchOperation(msearchBody, callbacks, done) {
            let retryCount = retries;
            // Instead of going full on async-await, which would make the code easier to read,
            // we have decided to use callback style instead.
            // This because every time we use async await, V8 will create multiple promises
            // behind the scenes, making the code slightly slower.
            tryMsearch(msearchBody, callbacks, retrySearch);
            function retrySearch(msearchBody, callbacks) {
                if (msearchBody.length > 0 && retryCount > 0) {
                    retryCount -= 1;
                    setTimeout(tryMsearch, wait, msearchBody, callbacks, retrySearch);
                    return;
                }
                done();
            }
            // This function never returns an error, if the msearch operation fails,
            // the error is dispatched to all search executors.
            function tryMsearch(msearchBody, callbacks, done) {
                client.msearch(Object.assign({}, msearchOptions, { body: msearchBody }), reqOptions)
                    .then(results => {
                    const retryBody = [];
                    const retryCallbacks = [];
                    const { responses } = results.body;
                    for (let i = 0, len = responses.length; i < len; i++) {
                        const response = responses[i];
                        if (response.status === 429 && retryCount > 0) {
                            retryBody.push(msearchBody[i * 2]);
                            retryBody.push(msearchBody[(i * 2) + 1]);
                            retryCallbacks.push(callbacks[i]);
                            continue;
                        }
                        const result = { ...results, body: response };
                        // @ts-expect-error
                        addDocumentsGetter(result);
                        if (response.status != null && response.status >= 400) {
                            callbacks[i](new ResponseError(result, errorOptions), result);
                        }
                        else {
                            callbacks[i](null, result);
                        }
                    }
                    done(retryBody, retryCallbacks);
                })
                    .catch(err => {
                    for (const callback of callbacks) {
                        callback(err, null);
                    }
                    return done([], []);
                });
            }
        }
    }
    /**
     * Creates a bulk helper instance. Once you configure it, you can pick which operation
     * to execute with the given dataset, index, create, update, and delete.
     * @param {object} options - The configuration of the bulk operation.
     * @param {object} reqOptions - The client optional configuration for this request.
     * @return {object} The possible operations to run with the datasource.
     */
    bulk(options, reqOptions = {}) {
        var _d, _e;
        (0, assert_1.default)(!((_d = reqOptions.asStream) !== null && _d !== void 0 ? _d : false), 'bulk helper: the asStream request option is not supported');
        const client = this[kClient];
        const { serializer } = client;
        if (this[kMetaHeader] !== null) {
            reqOptions.headers = (_e = reqOptions.headers) !== null && _e !== void 0 ? _e : {};
            reqOptions.headers['x-elastic-client-meta'] = `${this[kMetaHeader]},h=bp`;
        }
        reqOptions.meta = true;
        const { datasource, onDocument, flushBytes = 5000000, flushInterval = 30000, concurrency = 5, retries = this[kMaxRetries], wait = 5000, onDrop = noop, 
        // onSuccess does not default to noop, to avoid the performance hit
        // of deserializing every document in the bulk request
        onSuccess, refreshOnCompletion = false, ...bulkOptions } = options;
        if (datasource === undefined) {
            // @ts-expect-error
            return Promise.reject(new ConfigurationError('bulk helper: the datasource is required'));
        }
        if (!(Array.isArray(datasource) || Buffer.isBuffer(datasource) || isReadableStream(datasource) || isAsyncIterator(datasource))) {
            // @ts-expect-error
            return Promise.reject(new ConfigurationError('bulk helper: the datasource must be an array or a buffer or a readable stream or an async generator'));
        }
        if (onDocument === undefined) {
            // @ts-expect-error
            return Promise.reject(new ConfigurationError('bulk helper: the onDocument callback is required'));
        }
        let shouldAbort = false;
        let timeoutRef = null;
        const stats = {
            total: 0,
            failed: 0,
            retry: 0,
            successful: 0,
            noop: 0,
            time: 0,
            bytes: 0,
            aborted: false
        };
        const p = iterate();
        const helper = {
            [Symbol.toStringTag]: 'Promise',
            then(onFulfilled, onRejected) {
                return p.then(onFulfilled, onRejected);
            },
            catch(onRejected) {
                return p.catch(onRejected);
            },
            finally(onFinally) {
                return p.finally(onFinally);
            },
            get stats() {
                return stats;
            },
            abort() {
                clearTimeout(timeoutRef);
                shouldAbort = true;
                stats.aborted = true;
                return this;
            }
        };
        return helper;
        /**
         * Function that iterates over the given datasource and start a bulk operation as soon
         * as it reaches the configured bulk size. It's designed to use the Node.js asynchronous
         * model at this maximum capacity, as it will collect the next body to send while there is
         * a running http call. In this way, the CPU time will be used carefully.
         * The objects will be serialized right away, to approximate the byte length of the body.
         * It creates an array of strings instead of a ndjson string because the bulkOperation
         * will navigate the body for matching failed operations with the original document.
         */
        async function iterate() {
            const { semaphore, finish } = buildSemaphore();
            const startTime = Date.now();
            const bulkBody = [];
            let actionBody = '';
            let payloadBody = '';
            let chunkBytes = 0;
            timeoutRef = setTimeout(onFlushTimeout, flushInterval); // eslint-disable-line
            // @ts-expect-error datasource is an iterable
            for await (const chunk of datasource) {
                if (shouldAbort)
                    break;
                timeoutRef.refresh();
                const result = onDocument(chunk);
                const [action, payload] = Array.isArray(result) ? result : [result, chunk];
                const operation = Object.keys(action)[0];
                if (operation === 'index' || operation === 'create') {
                    actionBody = serializer.serialize(action);
                    payloadBody = typeof payload === 'string'
                        ? payload
                        : serializer.serialize(payload);
                    chunkBytes += Buffer.byteLength(actionBody) + Buffer.byteLength(payloadBody);
                    bulkBody.push(actionBody, payloadBody);
                }
                else if (operation === 'update') {
                    actionBody = serializer.serialize(action);
                    payloadBody = typeof chunk === 'string'
                        ? `{"doc":${chunk}}`
                        : serializer.serialize({ doc: chunk, ...payload });
                    chunkBytes += Buffer.byteLength(actionBody) + Buffer.byteLength(payloadBody);
                    bulkBody.push(actionBody, payloadBody);
                }
                else if (operation === 'delete') {
                    actionBody = serializer.serialize(action);
                    chunkBytes += Buffer.byteLength(actionBody);
                    bulkBody.push(actionBody);
                }
                else {
                    clearTimeout(timeoutRef);
                    throw new ConfigurationError(`Bulk helper invalid action: '${operation}'`);
                }
                if (chunkBytes >= flushBytes) {
                    stats.bytes += chunkBytes;
                    const bulkBodyCopy = bulkBody.slice();
                    bulkBody.length = 0;
                    chunkBytes = 0;
                    const send = await semaphore();
                    send(bulkBodyCopy);
                }
            }
            clearTimeout(timeoutRef);
            // In some cases the previous http call has not finished,
            // or we didn't reach the flush bytes threshold, so we force one last operation.
            if (!shouldAbort && chunkBytes > 0) {
                const send = await semaphore();
                stats.bytes += chunkBytes;
                send(bulkBody);
            }
            await finish();
            if (refreshOnCompletion !== false) {
                await client.indices.refresh({
                    index: typeof refreshOnCompletion === 'string'
                        ? refreshOnCompletion
                        : '_all'
                }, reqOptions);
            }
            stats.time = Date.now() - startTime;
            stats.total = stats.successful + stats.failed;
            return stats;
            async function onFlushTimeout() {
                if (chunkBytes === 0)
                    return;
                stats.bytes += chunkBytes;
                const bulkBodyCopy = bulkBody.slice();
                bulkBody.length = 0;
                chunkBytes = 0;
                try {
                    const send = await semaphore();
                    send(bulkBodyCopy);
                }
                catch (err) {
                    /* istanbul ignore next */
                    helper.abort(); // eslint-disable-line
                }
            }
        }
        // This function builds a semaphore using the concurrency
        // options of the bulk helper. It is used inside the iterator
        // to guarantee that no more than the number of operations
        // allowed to run at the same time are executed.
        // It returns a semaphore function which resolves in the next tick
        // if we didn't reach the maximum concurrency yet, otherwise it returns
        // a promise that resolves as soon as one of the running requests has finished.
        // The semaphore function resolves a send function, which will be used
        // to send the actual bulk request.
        // It also returns a finish function, which returns a promise that is resolved
        // when there are no longer request running. It rejects an error if one
        // of the request has failed for some reason.
        function buildSemaphore() {
            let resolveSemaphore = null;
            let resolveFinish = null;
            let rejectFinish = null;
            let error = null;
            let running = 0;
            return { semaphore, finish };
            function finish() {
                return new Promise((resolve, reject) => {
                    if (running === 0) {
                        if (error !== null) {
                            reject(error);
                        }
                        else {
                            resolve();
                        }
                    }
                    else {
                        resolveFinish = resolve;
                        rejectFinish = reject;
                    }
                });
            }
            function semaphore() {
                if (running < concurrency) {
                    running += 1;
                    return pImmediate(send);
                }
                else {
                    return new Promise((resolve, reject) => {
                        resolveSemaphore = resolve;
                    });
                }
            }
            function send(bulkBody) {
                /* istanbul ignore if */
                if (running > concurrency) {
                    throw new Error('Max concurrency reached');
                }
                bulkOperation(bulkBody, err => {
                    running -= 1;
                    if (err != null) {
                        shouldAbort = true;
                        error = err;
                    }
                    if (resolveSemaphore !== null) {
                        running += 1;
                        resolveSemaphore(send);
                        resolveSemaphore = null;
                    }
                    else if (resolveFinish != null && rejectFinish != null && running === 0) {
                        if (error != null) {
                            rejectFinish(error);
                        }
                        else {
                            resolveFinish();
                        }
                    }
                });
            }
        }
        function bulkOperation(bulkBody, callback) {
            let retryCount = retries;
            let isRetrying = false;
            // Instead of going full on async-await, which would make the code easier to read,
            // we have decided to use callback style instead.
            // This because every time we use async await, V8 will create multiple promises
            // behind the scenes, making the code slightly slower.
            tryBulk(bulkBody, retryDocuments);
            function retryDocuments(err, bulkBody) {
                if (err != null)
                    return callback(err);
                if (shouldAbort)
                    return callback();
                if (bulkBody.length > 0) {
                    if (retryCount > 0) {
                        isRetrying = true;
                        retryCount -= 1;
                        stats.retry += bulkBody.length;
                        setTimeout(tryBulk, wait, bulkBody, retryDocuments);
                        return;
                    }
                    for (let i = 0, len = bulkBody.length; i < len; i = i + 2) {
                        const operation = Object.keys(serializer.deserialize(bulkBody[i]))[0];
                        onDrop({
                            status: 429,
                            error: null,
                            operation: serializer.deserialize(bulkBody[i]),
                            // @ts-expect-error
                            document: operation !== 'delete'
                                ? serializer.deserialize(bulkBody[i + 1])
                                /* istanbul ignore next */
                                : null,
                            retried: isRetrying
                        });
                        stats.failed += 1;
                    }
                }
                callback();
            }
            /**
             * Zips bulk response items (the action's result) with the original document body.
             * The raw string version of action and document lines are also included.
             */
            function zipBulkResults(responseItems, bulkBody) {
                const zipped = [];
                let indexSlice = 0;
                for (let i = 0, len = responseItems.length; i < len; i++) {
                    const result = responseItems[i];
                    const operation = Object.keys(result)[0];
                    let zipResult;
                    if (operation === 'delete') {
                        zipResult = {
                            result,
                            raw: { action: bulkBody[indexSlice] }
                        };
                        indexSlice += 1;
                    }
                    else {
                        const document = bulkBody[indexSlice + 1];
                        zipResult = {
                            result,
                            raw: { action: bulkBody[indexSlice], document },
                            // this is a function so that deserialization is only done when needed
                            // to avoid a performance hit
                            document: () => serializer.deserialize(document)
                        };
                        indexSlice += 2;
                    }
                    zipped.push(zipResult);
                }
                return zipped;
            }
            function tryBulk(bulkBody, callback) {
                if (shouldAbort)
                    return callback(null, []);
                client.bulk(Object.assign({}, bulkOptions, { body: bulkBody }), reqOptions)
                    .then(response => {
                    var _d, _e, _f;
                    const result = response.body;
                    const results = zipBulkResults(result.items, bulkBody);
                    if (!result.errors) {
                        stats.successful += result.items.length;
                        for (const item of results) {
                            const { result, document = noop } = item;
                            if (((_d = result.update) === null || _d === void 0 ? void 0 : _d.result) === 'noop') {
                                stats.noop++;
                            }
                            if (onSuccess != null)
                                onSuccess({ result, document: document() });
                        }
                        return callback(null, []);
                    }
                    const retry = [];
                    for (const item of results) {
                        const { result, raw, document = noop } = item;
                        const operation = Object.keys(result)[0];
                        // @ts-expect-error
                        const responseItem = result[operation];
                        (0, assert_1.default)(responseItem !== undefined, 'The responseItem is undefined, please file a bug report');
                        if (responseItem.status >= 400) {
                            // 429 is the only status code where we might want to retry
                            // a document, because it was not an error in the document itself,
                            // but the ES node was handling too many operations.
                            if (responseItem.status === 429) {
                                retry.push(raw.action);
                                /* istanbul ignore next */
                                if (operation !== 'delete') {
                                    retry.push((_e = raw.document) !== null && _e !== void 0 ? _e : '');
                                }
                            }
                            else {
                                onDrop({
                                    status: responseItem.status,
                                    error: (_f = responseItem.error) !== null && _f !== void 0 ? _f : null,
                                    operation: serializer.deserialize(raw.action),
                                    // @ts-expect-error
                                    document: document(),
                                    retried: isRetrying
                                });
                                stats.failed += 1;
                            }
                        }
                        else {
                            stats.successful += 1;
                            if (onSuccess != null)
                                onSuccess({ result, document: document() });
                        }
                    }
                    callback(null, retry);
                })
                    .catch(err => {
                    callback(err, []);
                });
            }
        }
    }
    /**
     * Creates an ES|QL helper instance, to help transform the data returned by an ES|QL query into easy-to-use formats.
     * @param {object} params - Request parameters sent to esql.query()
     * @returns {object} EsqlHelper instance
     */
    esql(params, reqOptions = {}) {
        var _d;
        if (this[kMetaHeader] !== null) {
            reqOptions.headers = (_d = reqOptions.headers) !== null && _d !== void 0 ? _d : {};
            reqOptions.headers['x-elastic-client-meta'] = `${this[kMetaHeader]},h=qo`;
        }
        const client = this[kClient];
        function toRecords(response) {
            const { columns, values } = response;
            return values.map(row => {
                const doc = {};
                row.forEach((cell, index) => {
                    const { name } = columns[index];
                    // @ts-expect-error
                    doc[name] = cell;
                });
                return doc;
            });
        }
        const helper = {
            /**
             * Pivots ES|QL query results into an array of row objects, rather than the default format where each row is an array of values.
             */
            async toRecords() {
                params.format = 'json';
                // @ts-expect-error it's typed as ArrayBuffer but we know it will be JSON
                const response = await client.esql.query(params, reqOptions);
                const records = toRecords(response);
                const { columns } = response;
                return { records, columns };
            }
        };
        return helper;
    }
}
exports.default = Helpers;
_a = kClient, _b = kMetaHeader, _c = kMaxRetries;
// Using a getter will improve the overall performances of the code,
// as we will reed the documents only if needed.
function addDocumentsGetter(result) {
    Object.defineProperty(result, 'documents', {
        get() {
            var _d;
            if (((_d = this.body.hits) === null || _d === void 0 ? void 0 : _d.hits) != null) {
                // @ts-expect-error
                return this.body.hits.hits.map(d => d._source);
            }
            return [];
        }
    });
}
function appendFilterPath(filter, params, force) {
    if (params.filter_path !== undefined) {
        params.filter_path += ',' + filter; // eslint-disable-line
    }
    else if (force) {
        params.filter_path = filter;
    }
}
function isReadableStream(obj) {
    return obj != null && typeof obj.pipe === 'function';
}
function isAsyncIterator(obj) {
    return (obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]) != null;
}
//# sourceMappingURL=helpers.js.map