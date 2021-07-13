/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
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

'use strict'

const debug = require('debug')('elasticsearch')
const os = require('os')
const { gzip, unzip, createGzip } = require('zlib')
const buffer = require('buffer')
const ms = require('ms')
const {
    ConnectionError,
    RequestAbortedError,
    NoLivingConnectionsError,
    ResponseError,
    ConfigurationError
} = require('./errors')

const noop = () => {}

const clientVersion = require('../package.json').version
const userAgent = `elasticsearch-js/${clientVersion} (${os.platform()} ${os.release()}-${os.arch()}; Node.js ${process.version})`
const MAX_BUFFER_LENGTH = buffer.constants.MAX_LENGTH
const MAX_STRING_LENGTH = buffer.constants.MAX_STRING_LENGTH

class Transport {
    constructor (opts) {
        if (typeof opts.compression === 'string' && opts.compression !== 'gzip') {
            throw new ConfigurationError(`Invalid compression: '${opts.compression}'`)
        }

        this.emit = opts.emit
        this.connectionPool = opts.connectionPool
        this.serializer = opts.serializer
        this.maxRetries = opts.maxRetries
        this.requestTimeout = toMs(opts.requestTimeout)
        this.suggestCompression = opts.suggestCompression === true
        this.compression = opts.compression || false
        this.context = opts.context || null
        this.headers = Object.assign({},
            { 'user-agent': userAgent },
            opts.suggestCompression === true ? { 'accept-encoding': 'gzip,deflate' } : null,
            lowerCaseHeaders(opts.headers)
        )
        this.sniffInterval = opts.sniffInterval
        this.sniffOnConnectionFault = opts.sniffOnConnectionFault
        this.sniffEndpoint = opts.sniffEndpoint
        this.generateRequestId = opts.generateRequestId || generateRequestId()
        this.name = opts.name
        this.opaqueIdPrefix = opts.opaqueIdPrefix

        this.nodeFilter = opts.nodeFilter || defaultNodeFilter
        if (typeof opts.nodeSelector === 'function') {
            this.nodeSelector = opts.nodeSelector
        } else if (opts.nodeSelector === 'round-robin') {
            this.nodeSelector = roundRobinSelector()
        } else if (opts.nodeSelector === 'random') {
            this.nodeSelector = randomSelector
        } else {
            this.nodeSelector = roundRobinSelector()
        }

        this._sniffEnabled = typeof this.sniffInterval === 'number'
        this._nextSniff = this._sniffEnabled ? (Date.now() + this.sniffInterval) : 0
        this._isSniffing = false

        if (opts.sniffOnStart === true) {
            this.sniff({ reason: Transport.sniffReasons.SNIFF_ON_START })
        }
    }

    request (params, options, callback) {
        // console.log('r', params.path);
        const isMvt = params.path.indexOf('/_mvt') > 0;

        if (params.path.indexOf('/_mvt') > 0) {
            console.log('reqiuest', params, options);
        }
        options = options || {}
        if (typeof options === 'function') {
            callback = options
            options = {}
        }
        let p = null

        // promises support
        if (callback === undefined) {
            let onFulfilled = null
            let onRejected = null
            p = new Promise((resolve, reject) => {
                onFulfilled = resolve
                onRejected = reject
            })
            callback = function callback (err, result) {
                err ? onRejected(err) : onFulfilled(result)
            }
        }

        const meta = {
            context: null,
            request: {
                params: null,
                options: null,
                id: options.id || this.generateRequestId(params, options)
            },
            name: this.name,
            connection: null,
            attempts: 0,
            aborted: false
        }

        if (this.context != null && options.context != null) {
            meta.context = Object.assign({}, this.context, options.context)
        } else if (this.context != null) {
            meta.context = this.context
        } else if (options.context != null) {
            meta.context = options.context
        }

        const result = {
            body: null,
            statusCode: null,
            headers: null,
            meta
        }

        Object.defineProperty(result, 'warnings', {
            get () {
                return this.headers && this.headers.warning
                    ? this.headers.warning.split(/(?!\B"[^"]*),(?![^"]*"\B)/)
                    : null
            }
        })

        // We should not retry if we are sending a stream body, because we should store in memory
        // a copy of the stream to be able to send it again, but since we don't know in advance
        // the size of the stream, we risk to take too much memory.
        // Furthermore, copying everytime the stream is very a expensive operation.
        const maxRetries = isStream(params.body) || isStream(params.bulkBody)
            ? 0
            : (typeof options.maxRetries === 'number' ? options.maxRetries : this.maxRetries)
        const compression = options.compression !== undefined ? options.compression : this.compression
        let request = { abort: noop }
        const transportReturn = {
            then (onFulfilled, onRejected) {
                return p.then(onFulfilled, onRejected)
            },
            catch (onRejected) {
                return p.catch(onRejected)
            },
            abort () {
                meta.aborted = true
                request.abort()
                debug('Aborting request', params)
                return this
            },
            finally (onFinally) {
                return p.finally(onFinally)
            }
        }

        const makeRequest = () => {
            if (meta.aborted === true) {
                return process.nextTick(callback, new RequestAbortedError(), result)
            }
            meta.connection = this.getConnection({ requestId: meta.request.id })
            if (meta.connection == null) {
                return process.nextTick(callback, new NoLivingConnectionsError(), result)
            }
            this.emit('request', null, result)
            // perform the actual http request
            request = meta.connection.request(params, onResponse)
        }

        const onConnectionError = (err) => {
            if (err.name !== 'RequestAbortedError') {
                // if there is an error in the connection
                // let's mark the connection as dead
                this.connectionPool.markDead(meta.connection)

                if (this.sniffOnConnectionFault === true) {
                    this.sniff({
                        reason: Transport.sniffReasons.SNIFF_ON_CONNECTION_FAULT,
                        requestId: meta.request.id
                    })
                }

                // retry logic
                if (meta.attempts < maxRetries) {
                    meta.attempts++
                    debug(`Retrying request, there are still ${maxRetries - meta.attempts} attempts`, params)
                    makeRequest()
                    return
                }
            }

            err.meta = result
            this.emit('response', err, result)
            return callback(err, result)
        }

        const onResponse = (err, response) => {
            if (params.path.indexOf('/_mvt') > 0) {
                console.log('response!');
            }
            if (err !== null) {
                return onConnectionError(err)
            }

            result.statusCode = response.statusCode
            result.headers = response.headers

            if (options.asStream === true) {
                result.body = response
                this.emit('response', null, result)
                callback(null, result)
                return
            }

            const contentEncoding = (result.headers['content-encoding'] || '').toLowerCase()
            const isCompressed = contentEncoding.indexOf('gzip') > -1 || contentEncoding.indexOf('deflate') > -1

            /* istanbul ignore else */
            if (result.headers['content-length'] !== undefined) {
                const contentLength = Number(result.headers['content-length'])
                if (isCompressed && contentLength > MAX_BUFFER_LENGTH) {
                    response.destroy()
                    return onConnectionError(
                        new RequestAbortedError(`The content length (${contentLength}) is bigger than the maximum allowed buffer (${MAX_BUFFER_LENGTH})`, result)
                    )
                } else if (contentLength > MAX_STRING_LENGTH) {
                    response.destroy()
                    return onConnectionError(
                        new RequestAbortedError(`The content length (${contentLength}) is bigger than the maximum allowed string (${MAX_STRING_LENGTH})`, result)
                    )
                }
            }
            // if the response is compressed, we must handle it
            // as buffer for allowing decompression later
            let payload = isCompressed || isMvt ? [] : ''
            const onData = isCompressed || isMvt
                ? chunk => {
                    if (isCompressed) {
                        payload.push(chunk)
                    } else if (isMvt) {
                        console.log('chunk object length', typeof chunk, chunk.length);
                        // const c = Buffer.from(chunk, 'binary');
                        const c  = chunk;
                        console.log('buffer lenth', typeof c, c.length);
                        payload.push(c);
                    }
                }
                : chunk => { payload += chunk }
            const onEnd = err => {

                if (params.path.indexOf('/_mvt') > 0) {
                    console.log('end', payload);
                }

                response.removeListener('data', onData)
                response.removeListener('end', onEnd)
                response.removeListener('error', onEnd)
                response.removeListener('aborted', onAbort)

                if (err) {
                    return onConnectionError(new ConnectionError(err.message))
                }

                if (isCompressed || isMvt) {
                    if (isCompressed) {
                        unzip(Buffer.concat(payload), onBody)
                    } else {
                        console.log('concat payload', Buffer.concat(payload));
                        onBody(null, Buffer.concat(payload))
                    }
                } else {
                    onBody(null, payload)
                }
            }

            const onAbort = () => {
                response.destroy()
                onEnd(new Error('Response aborted while reading the body'))
            }

            if (!isCompressed) {
                if (isMvt) {
                    console.log('set encoding to binary!');
                    // response.setEncoding('binary');
                } else {
                    response.setEncoding('utf8')
                }
            }

            this.emit('deserialization', null, result)
            response.on('data', (data) => {
                if (params.path.indexOf('/_mvt') > 0) {
                    console.log('ondata', typeof data);
                }
                onData(data);
            })
            response.on('error', onEnd)
            response.on('end', onEnd)
            response.on('aborted', onAbort)
        }

        const onBody = (err, payload) => {
            if (err) {
                this.emit('response', err, result)
                return callback(err, result)
            }
            if (params.path.indexOf('/_mvt') > 0) {
                console.log('onbody', payload);
            }
            if (Buffer.isBuffer(payload)) {
                console.log('this is a bufger', payload);
                if (isMvt) {
                    payload = payload.toString('base64');
                    console.log('bas64', payload.length);
                } else {
                    payload = payload.toString();
                }
            }
            const isHead = params.method === 'HEAD'
            // we should attempt the payload deserialization only if:
            //    - a `content-type` is defined and is equal to `application/json`
            //    - the request is not a HEAD request
            //    - the payload is not an empty string
            if (result.headers['content-type'] !== undefined &&
                result.headers['content-type'].indexOf('application/json') > -1 &&
                isHead === false &&
                payload !== ''
            ) {
                try {
                    result.body = this.serializer.deserialize(payload)
                } catch (err) {
                    this.emit('response', err, result)
                    return callback(err, result)
                }
            } else {
                // cast to boolean if the request method was HEAD and there was no error
                result.body = isHead === true && result.statusCode < 400 ? true : payload
            }

            // we should ignore the statusCode if the user has configured the `ignore` field with
            // the statusCode we just got or if the request method is HEAD and the statusCode is 404
            const ignoreStatusCode = (Array.isArray(options.ignore) && options.ignore.indexOf(result.statusCode) > -1) ||
                (isHead === true && result.statusCode === 404)

            if (ignoreStatusCode === false &&
                (result.statusCode === 502 || result.statusCode === 503 || result.statusCode === 504)) {
                // if the statusCode is 502/3/4 we should run our retry strategy
                // and mark the connection as dead
                this.connectionPool.markDead(meta.connection)
                // retry logic (we shoukd not retry on "429 - Too Many Requests")
                if (meta.attempts < maxRetries && result.statusCode !== 429) {
                    meta.attempts++
                    debug(`Retrying request, there are still ${maxRetries - meta.attempts} attempts`, params)
                    makeRequest()
                    return
                }
            } else {
                // everything has worked as expected, let's mark
                // the connection as alive (or confirm it)
                this.connectionPool.markAlive(meta.connection)
            }

            if (ignoreStatusCode === false && result.statusCode >= 400) {
                const error = new ResponseError(result)
                this.emit('response', error, result)
                callback(error, result)
            } else {
                // cast to boolean if the request method was HEAD
                if (isHead === true && result.statusCode === 404) {
                    result.body = false
                }
                this.emit('response', null, result)
                callback(null, result)
            }
        }

        this.emit('serialization', null, result)
        const headers = Object.assign({}, this.headers, lowerCaseHeaders(options.headers))

        if (options.opaqueId !== undefined) {
            headers['x-opaque-id'] = this.opaqueIdPrefix !== null
                ? this.opaqueIdPrefix + options.opaqueId
                : options.opaqueId
        }

        // handle json body
        if (params.body != null) {
            if (shouldSerialize(params.body) === true) {
                try {
                    params.body = this.serializer.serialize(params.body)
                } catch (err) {
                    this.emit('request', err, result)
                    process.nextTick(callback, err, result)
                    return transportReturn
                }
            }

            if (params.body !== '') {
                headers['content-type'] = headers['content-type'] || 'application/json'
            }

            // handle ndjson body
        } else if (params.bulkBody != null) {
            if (shouldSerialize(params.bulkBody) === true) {
                try {
                    params.body = this.serializer.ndserialize(params.bulkBody)
                } catch (err) {
                    this.emit('request', err, result)
                    process.nextTick(callback, err, result)
                    return transportReturn
                }
            } else {
                params.body = params.bulkBody
            }
            if (params.body !== '') {
                headers['content-type'] = headers['content-type'] || 'application/x-ndjson'
            }
        }

        params.headers = headers
        // serializes the querystring
        if (options.querystring == null) {
            params.querystring = this.serializer.qserialize(params.querystring)
        } else {
            params.querystring = this.serializer.qserialize(
                Object.assign({}, params.querystring, options.querystring)
            )
        }

        // handles request timeout
        params.timeout = toMs(options.requestTimeout || this.requestTimeout)
        if (options.asStream === true) params.asStream = true
        meta.request.params = params
        meta.request.options = options

        // handle compression
        if (params.body !== '' && params.body != null) {
            if (isStream(params.body) === true) {
                if (compression === 'gzip') {
                    params.headers['content-encoding'] = compression
                    params.body = params.body.pipe(createGzip())
                }
                makeRequest()
            } else if (compression === 'gzip') {
                gzip(params.body, (err, buffer) => {
                    /* istanbul ignore next */
                    if (err) {
                        this.emit('request', err, result)
                        return callback(err, result)
                    }
                    params.headers['content-encoding'] = compression
                    params.headers['content-length'] = '' + Buffer.byteLength(buffer)
                    params.body = buffer
                    makeRequest()
                })
            } else {
                params.headers['content-length'] = '' + Buffer.byteLength(params.body)
                makeRequest()
            }
        } else {
            makeRequest()
        }

        return transportReturn
    }

    getConnection (opts) {
        const now = Date.now()
        if (this._sniffEnabled === true && now > this._nextSniff) {
            this.sniff({ reason: Transport.sniffReasons.SNIFF_INTERVAL, requestId: opts.requestId })
        }
        return this.connectionPool.getConnection({
            filter: this.nodeFilter,
            selector: this.nodeSelector,
            requestId: opts.requestId,
            name: this.name,
            now
        })
    }

    sniff (opts, callback = noop) {
        if (this._isSniffing === true) return
        this._isSniffing = true
        debug('Started sniffing request')

        if (typeof opts === 'function') {
            callback = opts
            opts = { reason: Transport.sniffReasons.DEFAULT }
        }

        const { reason } = opts

        const request = {
            method: 'GET',
            path: this.sniffEndpoint
        }

        this.request(request, { id: opts.requestId }, (err, result) => {
            this._isSniffing = false
            if (this._sniffEnabled === true) {
                this._nextSniff = Date.now() + this.sniffInterval
            }

            if (err != null) {
                debug('Sniffing errored', err)
                result.meta.sniff = { hosts: [], reason }
                this.emit('sniff', err, result)
                return callback(err)
            }

            debug('Sniffing ended successfully', result.body)
            const protocol = result.meta.connection.url.protocol || /* istanbul ignore next */ 'http:'
            const hosts = this.connectionPool.nodesToHost(result.body.nodes, protocol)
            this.connectionPool.update(hosts)

            result.meta.sniff = { hosts, reason }
            this.emit('sniff', null, result)
            callback(null, hosts)
        })
    }
}

Transport.sniffReasons = {
    SNIFF_ON_START: 'sniff-on-start',
    SNIFF_INTERVAL: 'sniff-interval',
    SNIFF_ON_CONNECTION_FAULT: 'sniff-on-connection-fault',
    // TODO: find a better name
    DEFAULT: 'default'
}

function toMs (time) {
    if (typeof time === 'string') {
        return ms(time)
    }
    return time
}

function shouldSerialize (obj) {
    return typeof obj !== 'string' &&
        typeof obj.pipe !== 'function' &&
        Buffer.isBuffer(obj) === false
}

function isStream (obj) {
    return obj != null && typeof obj.pipe === 'function'
}

function defaultNodeFilter (node) {
    // avoid master only nodes
    if (node.roles.master === true &&
        node.roles.data === false &&
        node.roles.ingest === false) {
        return false
    }
    return true
}

function roundRobinSelector () {
    let current = -1
    return function _roundRobinSelector (connections) {
        if (++current >= connections.length) {
            current = 0
        }
        return connections[current]
    }
}

function randomSelector (connections) {
    const index = Math.floor(Math.random() * connections.length)
    return connections[index]
}

function generateRequestId () {
    const maxInt = 2147483647
    let nextReqId = 0
    return function genReqId (params, options) {
        return (nextReqId = (nextReqId + 1) & maxInt)
    }
}

function lowerCaseHeaders (oldHeaders) {
    if (oldHeaders == null) return oldHeaders
    const newHeaders = {}
    for (const header in oldHeaders) {
        newHeaders[header.toLowerCase()] = oldHeaders[header]
    }
    return newHeaders
}

module.exports = Transport
module.exports.internals = {
    defaultNodeFilter,
    roundRobinSelector,
    randomSelector,
    generateRequestId,
    lowerCaseHeaders
}
