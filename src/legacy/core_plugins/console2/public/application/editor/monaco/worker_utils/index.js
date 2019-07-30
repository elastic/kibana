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

/* eslint-disable */

(function(factory) {
  typeof define === 'function' && define.amd ? define(factory) : factory();
})(function() {
  'use strict';

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  // Avoid circular dependency on EventEmitter by implementing a subset of the interface.
  var ErrorHandler = /** @class */ (function() {
    function ErrorHandler() {
      this.listeners = [];
      this.unexpectedErrorHandler = function(e) {
        setTimeout(function() {
          if (e.stack) {
            throw new Error(e.message + '\n\n' + e.stack);
          }
          throw e;
        }, 0);
      };
    }
    ErrorHandler.prototype.emit = function(e) {
      this.listeners.forEach(function(listener) {
        listener(e);
      });
    };
    ErrorHandler.prototype.onUnexpectedError = function(e) {
      this.unexpectedErrorHandler(e);
      this.emit(e);
    };
    // For external errors, we don't want the listeners to be called
    ErrorHandler.prototype.onUnexpectedExternalError = function(e) {
      this.unexpectedErrorHandler(e);
    };
    return ErrorHandler;
  })();
  var errorHandler = new ErrorHandler();
  function onUnexpectedError(e) {
    // ignore errors from cancelled promises
    if (!isPromiseCanceledError(e)) {
      errorHandler.onUnexpectedError(e);
    }
    return undefined;
  }
  function transformErrorForSerialization(error) {
    if (error instanceof Error) {
      var name_1 = error.name,
        message = error.message;
      var stack = error.stacktrace || error.stack;
      return {
        $isError: true,
        name: name_1,
        message: message,
        stack: stack,
      };
    }
    // return as is
    return error;
  }
  var canceledName = 'Canceled';
  /**
   * Checks if the given error is a promise in canceled state
   */
  function isPromiseCanceledError(error) {
    return error instanceof Error && error.name === canceledName && error.message === canceledName;
  }

  function dispose(first) {
    var rest = [];
    for (var _i = 1; _i < arguments.length; _i++) {
      rest[_i - 1] = arguments[_i];
    }
    if (Array.isArray(first)) {
      first.forEach(function(d) {
        return d && d.dispose();
      });
      return [];
    } else if (rest.length === 0) {
      if (first) {
        first.dispose();
        return first;
      }
      return undefined;
    } else {
      dispose(first);
      dispose(rest);
      return [];
    }
  }
  function combinedDisposable(disposables) {
    return {
      dispose: function() {
        return dispose(disposables);
      },
    };
  }
  function toDisposable(fn) {
    return {
      dispose: function() {
        fn();
      },
    };
  }
  var Disposable = /** @class */ (function() {
    function Disposable() {
      this._toDispose = [];
      this._lifecycle_disposable_isDisposed = false;
    }
    Disposable.prototype.dispose = function() {
      this._lifecycle_disposable_isDisposed = true;
      this._toDispose = dispose(this._toDispose);
    };
    Disposable.prototype._register = function(t) {
      if (this._lifecycle_disposable_isDisposed) {
        console.warn('Registering disposable on object that has already been disposed.');
        t.dispose();
      } else {
        this._toDispose.push(t);
      }
      return t;
    };
    Disposable.None = Object.freeze({ dispose: function() {} });
    return Disposable;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var LANGUAGE_DEFAULT = 'en';
  var _isWindows = false;
  var _isMacintosh = false;
  var _isLinux = false;
  var _locale = undefined;
  var _language = LANGUAGE_DEFAULT;
  var _translationsConfigFile = undefined;
  var isElectronRenderer =
    typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    typeof process.versions.electron !== 'undefined' &&
    process.type === 'renderer';
  // OS detection
  if (typeof navigator === 'object' && !isElectronRenderer) {
    var userAgent = navigator.userAgent;
    _isWindows = userAgent.indexOf('Windows') >= 0;
    _isMacintosh = userAgent.indexOf('Macintosh') >= 0;
    _isLinux = userAgent.indexOf('Linux') >= 0;
    _locale = navigator.language;
    _language = _locale;
  } else if (typeof process === 'object') {
    _isWindows = process.platform === 'win32';
    _isMacintosh = process.platform === 'darwin';
    _isLinux = process.platform === 'linux';
    _locale = LANGUAGE_DEFAULT;
    _language = LANGUAGE_DEFAULT;
    var rawNlsConfig = process.env['VSCODE_NLS_CONFIG'];
    if (rawNlsConfig) {
      try {
        var nlsConfig = JSON.parse(rawNlsConfig);
        var resolved = nlsConfig.availableLanguages['*'];
        _locale = nlsConfig.locale;
        // VSCode's default language is 'en'
        _language = resolved ? resolved : LANGUAGE_DEFAULT;
        _translationsConfigFile = nlsConfig._translationsConfigFile;
      } catch (e) {}
    }
  }
  var isWindows = _isWindows;
  var _globals = typeof self === 'object' ? self : typeof global === 'object' ? global : {};
  var globals = _globals;

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  function getAllPropertyNames(obj) {
    var res = [];
    var proto = Object.getPrototypeOf(obj);
    while (Object.prototype !== proto) {
      res = res.concat(Object.getOwnPropertyNames(proto));
      proto = Object.getPrototypeOf(proto);
    }
    return res;
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var __extends =
    (undefined && undefined.__extends) ||
    (function() {
      var extendStatics = function(d, b) {
        extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function(d, b) {
              d.__proto__ = b;
            }) ||
          function(d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();
  var INITIALIZE = '$initialize';
  var SimpleWorkerProtocol = /** @class */ (function() {
    function SimpleWorkerProtocol(handler) {
      this._workerId = -1;
      this._handler = handler;
      this._lastSentReq = 0;
      this._pendingReplies = Object.create(null);
    }
    SimpleWorkerProtocol.prototype.setWorkerId = function(workerId) {
      this._workerId = workerId;
    };
    SimpleWorkerProtocol.prototype.sendMessage = function(method, args) {
      var _this = this;
      var req = String(++this._lastSentReq);
      return new Promise(function(resolve, reject) {
        _this._pendingReplies[req] = {
          resolve: resolve,
          reject: reject,
        };
        _this._send({
          vsWorker: _this._workerId,
          req: req,
          method: method,
          args: args,
        });
      });
    };
    SimpleWorkerProtocol.prototype.handleMessage = function(serializedMessage) {
      var message;
      try {
        message = JSON.parse(serializedMessage);
      } catch (e) {
        // nothing
        return;
      }
      if (!message || !message.vsWorker) {
        return;
      }
      if (this._workerId !== -1 && message.vsWorker !== this._workerId) {
        return;
      }
      this._handleMessage(message);
    };
    SimpleWorkerProtocol.prototype._handleMessage = function(msg) {
      var _this = this;
      if (msg.seq) {
        var replyMessage = msg;
        if (!this._pendingReplies[replyMessage.seq]) {
          console.warn('Got reply to unknown seq');
          return;
        }
        var reply = this._pendingReplies[replyMessage.seq];
        delete this._pendingReplies[replyMessage.seq];
        if (replyMessage.err) {
          var err = replyMessage.err;
          if (replyMessage.err.$isError) {
            err = new Error();
            err.name = replyMessage.err.name;
            err.message = replyMessage.err.message;
            err.stack = replyMessage.err.stack;
          }
          reply.reject(err);
          return;
        }
        reply.resolve(replyMessage.res);
        return;
      }
      var requestMessage = msg;
      var req = requestMessage.req;
      var result = this._handler.handleMessage(requestMessage.method, requestMessage.args);
      result.then(
        function(r) {
          _this._send({
            vsWorker: _this._workerId,
            seq: req,
            res: r,
            err: undefined,
          });
        },
        function(e) {
          if (e.detail instanceof Error) {
            // Loading errors have a detail property that points to the actual error
            e.detail = transformErrorForSerialization(e.detail);
          }
          _this._send({
            vsWorker: _this._workerId,
            seq: req,
            res: undefined,
            err: transformErrorForSerialization(e),
          });
        }
      );
    };
    SimpleWorkerProtocol.prototype._send = function(msg) {
      var strMsg = JSON.stringify(msg);
      // console.log('SENDING: ' + strMsg);
      this._handler.sendMessage(strMsg);
    };
    return SimpleWorkerProtocol;
  })();
  /**
   * Main thread side
   */
  var SimpleWorkerClient = /** @class */ (function(_super) {
    __extends(SimpleWorkerClient, _super);
    function SimpleWorkerClient(workerFactory, moduleId) {
      var _this = _super.call(this) || this;
      var lazyProxyReject = null;
      _this._worker = _this._register(
        workerFactory.create(
          'vs/base/common/worker/simpleWorker',
          function(msg) {
            _this._protocol.handleMessage(msg);
          },
          function(err) {
            // in Firefox, web workers fail lazily :(
            // we will reject the proxy
            if (lazyProxyReject) {
              lazyProxyReject(err);
            }
          }
        )
      );
      _this._protocol = new SimpleWorkerProtocol({
        sendMessage: function(msg) {
          _this._worker.postMessage(msg);
        },
        handleMessage: function(method, args) {
          // Intentionally not supporting worker -> main requests
          return Promise.resolve(null);
        },
      });
      _this._protocol.setWorkerId(_this._worker.getId());
      // Gather loader configuration
      var loaderConfiguration = null;
      if (typeof self.require !== 'undefined' && typeof self.require.getConfig === 'function') {
        // Get the configuration from the Monaco AMD Loader
        loaderConfiguration = self.require.getConfig();
      } else if (typeof self.requirejs !== 'undefined') {
        // Get the configuration from requirejs
        loaderConfiguration = self.requirejs.s.contexts._.config;
      }
      // Send initialize message
      _this._onModuleLoaded = _this._protocol.sendMessage(INITIALIZE, [
        _this._worker.getId(),
        moduleId,
        loaderConfiguration,
      ]);
      _this._lazyProxy = new Promise(function(resolve, reject) {
        lazyProxyReject = reject;
        _this._onModuleLoaded.then(
          function(availableMethods) {
            var proxy = {};
            for (
              var _i = 0, availableMethods_1 = availableMethods;
              _i < availableMethods_1.length;
              _i++
            ) {
              var methodName = availableMethods_1[_i];
              proxy[methodName] = createProxyMethod(methodName, proxyMethodRequest);
            }
            resolve(proxy);
          },
          function(e) {
            reject(e);
            _this._onError('Worker failed to load ' + moduleId, e);
          }
        );
      });
      // Create proxy to loaded code
      var proxyMethodRequest = function(method, args) {
        return _this._request(method, args);
      };
      var createProxyMethod = function(method, proxyMethodRequest) {
        return function() {
          var args = Array.prototype.slice.call(arguments, 0);
          return proxyMethodRequest(method, args);
        };
      };
      return _this;
    }
    SimpleWorkerClient.prototype.getProxyObject = function() {
      return this._lazyProxy;
    };
    SimpleWorkerClient.prototype._request = function(method, args) {
      var _this = this;
      return new Promise(function(resolve, reject) {
        _this._onModuleLoaded.then(function() {
          _this._protocol.sendMessage(method, args).then(resolve, reject);
        }, reject);
      });
    };
    SimpleWorkerClient.prototype._onError = function(message, error) {
      console.error(message);
      console.info(error);
    };
    return SimpleWorkerClient;
  })(Disposable);
  /**
   * Worker side
   */
  var SimpleWorkerServer = /** @class */ (function() {
    function SimpleWorkerServer(postSerializedMessage, requestHandler) {
      var _this = this;
      this._requestHandler = requestHandler;
      this._protocol = new SimpleWorkerProtocol({
        sendMessage: function(msg) {
          postSerializedMessage(msg);
        },
        handleMessage: function(method, args) {
          return _this._handleMessage(method, args);
        },
      });
    }
    SimpleWorkerServer.prototype.onmessage = function(msg) {
      this._protocol.handleMessage(msg);
    };
    SimpleWorkerServer.prototype._handleMessage = function(method, args) {
      if (method === INITIALIZE) {
        return this.initialize(args[0], args[1], args[2]);
      }
      if (!this._requestHandler || typeof this._requestHandler[method] !== 'function') {
        return Promise.reject(new Error('Missing requestHandler or method: ' + method));
      }
      try {
        return Promise.resolve(this._requestHandler[method].apply(this._requestHandler, args));
      } catch (e) {
        return Promise.reject(e);
      }
    };
    SimpleWorkerServer.prototype.initialize = function(workerId, moduleId, loaderConfig) {
      var _this = this;
      this._protocol.setWorkerId(workerId);
      if (this._requestHandler) {
        // static request handler
        var methods = [];
        for (var _i = 0, _a = getAllPropertyNames(this._requestHandler); _i < _a.length; _i++) {
          var prop = _a[_i];
          if (typeof this._requestHandler[prop] === 'function') {
            methods.push(prop);
          }
        }
        return Promise.resolve(methods);
      }
      if (loaderConfig) {
        // Remove 'baseUrl', handling it is beyond scope for now
        if (typeof loaderConfig.baseUrl !== 'undefined') {
          delete loaderConfig['baseUrl'];
        }
        if (typeof loaderConfig.paths !== 'undefined') {
          if (typeof loaderConfig.paths.vs !== 'undefined') {
            delete loaderConfig.paths['vs'];
          }
        }
        // Since this is in a web worker, enable catching errors
        loaderConfig.catchError = true;
        self.require.config(loaderConfig);
      }
      return new Promise(function(resolve, reject) {
        // Use the global require to be sure to get the global config
        self.require(
          [moduleId],
          function() {
            var result = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              result[_i] = arguments[_i];
            }
            var handlerModule = result[0];
            _this._requestHandler = handlerModule.create();
            if (!_this._requestHandler) {
              reject(new Error('No RequestHandler!'));
              return;
            }
            var methods = [];
            for (
              var _a = 0, _b = getAllPropertyNames(_this._requestHandler);
              _a < _b.length;
              _a++
            ) {
              var prop = _b[_a];
              if (typeof _this._requestHandler[prop] === 'function') {
                methods.push(prop);
              }
            }
            resolve(methods);
          },
          reject
        );
      });
    };
    return SimpleWorkerServer;
  })();

  /**
   * Returns the last element of an array.
   * @param array The array.
   * @param n Which element from the end (default is zero).
   */
  /**
   * Like `Array#sort` but always stable. Usually runs a little slower `than Array#sort`
   * so only use this when actually needing stable sort.
   */
  function mergeSort(data, compare) {
    _sort(data, compare, 0, data.length - 1, []);
    return data;
  }
  function _merge(a, compare, lo, mid, hi, aux) {
    var leftIdx = lo,
      rightIdx = mid + 1;
    for (var i = lo; i <= hi; i++) {
      aux[i] = a[i];
    }
    for (var i = lo; i <= hi; i++) {
      if (leftIdx > mid) {
        // left side consumed
        a[i] = aux[rightIdx++];
      } else if (rightIdx > hi) {
        // right side consumed
        a[i] = aux[leftIdx++];
      } else if (compare(aux[rightIdx], aux[leftIdx]) < 0) {
        // right element is less -> comes first
        a[i] = aux[rightIdx++];
      } else {
        // left element comes first (less or equal)
        a[i] = aux[leftIdx++];
      }
    }
  }
  function _sort(a, compare, lo, hi, aux) {
    if (hi <= lo) {
      return;
    }
    var mid = (lo + (hi - lo) / 2) | 0;
    _sort(a, compare, lo, mid, aux);
    _sort(a, compare, mid + 1, hi, aux);
    if (compare(a[mid], a[mid + 1]) <= 0) {
      // left and right are sorted and if the last-left element is less
      // or equals than the first-right element there is nothing else
      // to do
      return;
    }
    _merge(a, compare, lo, mid, hi, aux);
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  /**
   * Represents information about a specific difference between two sequences.
   */
  var DiffChange = /** @class */ (function() {
    /**
     * Constructs a new DiffChange with the given sequence information
     * and content.
     */
    function DiffChange(originalStart, originalLength, modifiedStart, modifiedLength) {
      //Debug.Assert(originalLength > 0 || modifiedLength > 0, "originalLength and modifiedLength cannot both be <= 0");
      this.originalStart = originalStart;
      this.originalLength = originalLength;
      this.modifiedStart = modifiedStart;
      this.modifiedLength = modifiedLength;
    }
    /**
     * The end point (exclusive) of the change in the original sequence.
     */
    DiffChange.prototype.getOriginalEnd = function() {
      return this.originalStart + this.originalLength;
    };
    /**
     * The end point (exclusive) of the change in the modified sequence.
     */
    DiffChange.prototype.getModifiedEnd = function() {
      return this.modifiedStart + this.modifiedLength;
    };
    return DiffChange;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  function createStringSequence(a) {
    return {
      getLength: function() {
        return a.length;
      },
      getElementAtIndex: function(pos) {
        return a.charCodeAt(pos);
      },
    };
  }
  function stringDiff(original, modified, pretty) {
    return new LcsDiff(createStringSequence(original), createStringSequence(modified)).ComputeDiff(
      pretty
    );
  }
  //
  // The code below has been ported from a C# implementation in VS
  //
  var Debug = /** @class */ (function() {
    function Debug() {}
    Debug.Assert = function(condition, message) {
      if (!condition) {
        throw new Error(message);
      }
    };
    return Debug;
  })();
  var MyArray = /** @class */ (function() {
    function MyArray() {}
    /**
     * Copies a range of elements from an Array starting at the specified source index and pastes
     * them to another Array starting at the specified destination index. The length and the indexes
     * are specified as 64-bit integers.
     * sourceArray:
     *		The Array that contains the data to copy.
     * sourceIndex:
     *		A 64-bit integer that represents the index in the sourceArray at which copying begins.
     * destinationArray:
     *		The Array that receives the data.
     * destinationIndex:
     *		A 64-bit integer that represents the index in the destinationArray at which storing begins.
     * length:
     *		A 64-bit integer that represents the number of elements to copy.
     */
    MyArray.Copy = function(sourceArray, sourceIndex, destinationArray, destinationIndex, length) {
      for (var i = 0; i < length; i++) {
        destinationArray[destinationIndex + i] = sourceArray[sourceIndex + i];
      }
    };
    return MyArray;
  })();
  //*****************************************************************************
  // LcsDiff.cs
  //
  // An implementation of the difference algorithm described in
  // "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers
  //
  // Copyright (C) 2008 Microsoft Corporation @minifier_do_not_preserve
  //*****************************************************************************
  // Our total memory usage for storing history is (worst-case):
  // 2 * [(MaxDifferencesHistory + 1) * (MaxDifferencesHistory + 1) - 1] * sizeof(int)
  // 2 * [1448*1448 - 1] * 4 = 16773624 = 16MB
  var MaxDifferencesHistory = 1447;
  //let MaxDifferencesHistory = 100;
  /**
   * A utility class which helps to create the set of DiffChanges from
   * a difference operation. This class accepts original DiffElements and
   * modified DiffElements that are involved in a particular change. The
   * MarktNextChange() method can be called to mark the separation between
   * distinct changes. At the end, the Changes property can be called to retrieve
   * the constructed changes.
   */
  var DiffChangeHelper = /** @class */ (function() {
    /**
     * Constructs a new DiffChangeHelper for the given DiffSequences.
     */
    function DiffChangeHelper() {
      this.m_changes = [];
      this.m_originalStart = Number.MAX_VALUE;
      this.m_modifiedStart = Number.MAX_VALUE;
      this.m_originalCount = 0;
      this.m_modifiedCount = 0;
    }
    /**
     * Marks the beginning of the next change in the set of differences.
     */
    DiffChangeHelper.prototype.MarkNextChange = function() {
      // Only add to the list if there is something to add
      if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
        // Add the new change to our list
        this.m_changes.push(
          new DiffChange(
            this.m_originalStart,
            this.m_originalCount,
            this.m_modifiedStart,
            this.m_modifiedCount
          )
        );
      }
      // Reset for the next change
      this.m_originalCount = 0;
      this.m_modifiedCount = 0;
      this.m_originalStart = Number.MAX_VALUE;
      this.m_modifiedStart = Number.MAX_VALUE;
    };
    /**
     * Adds the original element at the given position to the elements
     * affected by the current change. The modified index gives context
     * to the change position with respect to the original sequence.
     * @param originalIndex The index of the original element to add.
     * @param modifiedIndex The index of the modified element that provides corresponding position in the modified sequence.
     */
    DiffChangeHelper.prototype.AddOriginalElement = function(originalIndex, modifiedIndex) {
      // The 'true' start index is the smallest of the ones we've seen
      this.m_originalStart = Math.min(this.m_originalStart, originalIndex);
      this.m_modifiedStart = Math.min(this.m_modifiedStart, modifiedIndex);
      this.m_originalCount++;
    };
    /**
     * Adds the modified element at the given position to the elements
     * affected by the current change. The original index gives context
     * to the change position with respect to the modified sequence.
     * @param originalIndex The index of the original element that provides corresponding position in the original sequence.
     * @param modifiedIndex The index of the modified element to add.
     */
    DiffChangeHelper.prototype.AddModifiedElement = function(originalIndex, modifiedIndex) {
      // The 'true' start index is the smallest of the ones we've seen
      this.m_originalStart = Math.min(this.m_originalStart, originalIndex);
      this.m_modifiedStart = Math.min(this.m_modifiedStart, modifiedIndex);
      this.m_modifiedCount++;
    };
    /**
     * Retrieves all of the changes marked by the class.
     */
    DiffChangeHelper.prototype.getChanges = function() {
      if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
        // Finish up on whatever is left
        this.MarkNextChange();
      }
      return this.m_changes;
    };
    /**
     * Retrieves all of the changes marked by the class in the reverse order
     */
    DiffChangeHelper.prototype.getReverseChanges = function() {
      if (this.m_originalCount > 0 || this.m_modifiedCount > 0) {
        // Finish up on whatever is left
        this.MarkNextChange();
      }
      this.m_changes.reverse();
      return this.m_changes;
    };
    return DiffChangeHelper;
  })();
  /**
   * An implementation of the difference algorithm described in
   * "An O(ND) Difference Algorithm and its variations" by Eugene W. Myers
   */
  var LcsDiff = /** @class */ (function() {
    /**
     * Constructs the DiffFinder
     */
    function LcsDiff(originalSequence, newSequence, continueProcessingPredicate) {
      if (continueProcessingPredicate === void 0) {
        continueProcessingPredicate = null;
      }
      this.OriginalSequence = originalSequence;
      this.ModifiedSequence = newSequence;
      this.ContinueProcessingPredicate = continueProcessingPredicate;
      this.m_forwardHistory = [];
      this.m_reverseHistory = [];
    }
    LcsDiff.prototype.ElementsAreEqual = function(originalIndex, newIndex) {
      return (
        this.OriginalSequence.getElementAtIndex(originalIndex) ===
        this.ModifiedSequence.getElementAtIndex(newIndex)
      );
    };
    LcsDiff.prototype.OriginalElementsAreEqual = function(index1, index2) {
      return (
        this.OriginalSequence.getElementAtIndex(index1) ===
        this.OriginalSequence.getElementAtIndex(index2)
      );
    };
    LcsDiff.prototype.ModifiedElementsAreEqual = function(index1, index2) {
      return (
        this.ModifiedSequence.getElementAtIndex(index1) ===
        this.ModifiedSequence.getElementAtIndex(index2)
      );
    };
    LcsDiff.prototype.ComputeDiff = function(pretty) {
      return this._ComputeDiff(
        0,
        this.OriginalSequence.getLength() - 1,
        0,
        this.ModifiedSequence.getLength() - 1,
        pretty
      );
    };
    /**
     * Computes the differences between the original and modified input
     * sequences on the bounded range.
     * @returns An array of the differences between the two input sequences.
     */
    LcsDiff.prototype._ComputeDiff = function(
      originalStart,
      originalEnd,
      modifiedStart,
      modifiedEnd,
      pretty
    ) {
      var quitEarlyArr = [false];
      var changes = this.ComputeDiffRecursive(
        originalStart,
        originalEnd,
        modifiedStart,
        modifiedEnd,
        quitEarlyArr
      );
      if (pretty) {
        // We have to clean up the computed diff to be more intuitive
        // but it turns out this cannot be done correctly until the entire set
        // of diffs have been computed
        return this.PrettifyChanges(changes);
      }
      return changes;
    };
    /**
     * Private helper method which computes the differences on the bounded range
     * recursively.
     * @returns An array of the differences between the two input sequences.
     */
    LcsDiff.prototype.ComputeDiffRecursive = function(
      originalStart,
      originalEnd,
      modifiedStart,
      modifiedEnd,
      quitEarlyArr
    ) {
      quitEarlyArr[0] = false;
      // Find the start of the differences
      while (
        originalStart <= originalEnd &&
        modifiedStart <= modifiedEnd &&
        this.ElementsAreEqual(originalStart, modifiedStart)
      ) {
        originalStart++;
        modifiedStart++;
      }
      // Find the end of the differences
      while (
        originalEnd >= originalStart &&
        modifiedEnd >= modifiedStart &&
        this.ElementsAreEqual(originalEnd, modifiedEnd)
      ) {
        originalEnd--;
        modifiedEnd--;
      }
      // In the special case where we either have all insertions or all deletions or the sequences are identical
      if (originalStart > originalEnd || modifiedStart > modifiedEnd) {
        var changes = void 0;
        if (modifiedStart <= modifiedEnd) {
          Debug.Assert(
            originalStart === originalEnd + 1,
            'originalStart should only be one more than originalEnd'
          );
          // All insertions
          changes = [
            new DiffChange(originalStart, 0, modifiedStart, modifiedEnd - modifiedStart + 1),
          ];
        } else if (originalStart <= originalEnd) {
          Debug.Assert(
            modifiedStart === modifiedEnd + 1,
            'modifiedStart should only be one more than modifiedEnd'
          );
          // All deletions
          changes = [
            new DiffChange(originalStart, originalEnd - originalStart + 1, modifiedStart, 0),
          ];
        } else {
          Debug.Assert(
            originalStart === originalEnd + 1,
            'originalStart should only be one more than originalEnd'
          );
          Debug.Assert(
            modifiedStart === modifiedEnd + 1,
            'modifiedStart should only be one more than modifiedEnd'
          );
          // Identical sequences - No differences
          changes = [];
        }
        return changes;
      }
      // This problem can be solved using the Divide-And-Conquer technique.
      var midOriginalArr = [0],
        midModifiedArr = [0];
      var result = this.ComputeRecursionPoint(
        originalStart,
        originalEnd,
        modifiedStart,
        modifiedEnd,
        midOriginalArr,
        midModifiedArr,
        quitEarlyArr
      );
      var midOriginal = midOriginalArr[0];
      var midModified = midModifiedArr[0];
      if (result !== null) {
        // Result is not-null when there was enough memory to compute the changes while
        // searching for the recursion point
        return result;
      } else if (!quitEarlyArr[0]) {
        // We can break the problem down recursively by finding the changes in the
        // First Half:   (originalStart, modifiedStart) to (midOriginal, midModified)
        // Second Half:  (midOriginal + 1, minModified + 1) to (originalEnd, modifiedEnd)
        // NOTE: ComputeDiff() is inclusive, therefore the second range starts on the next point
        var leftChanges = this.ComputeDiffRecursive(
          originalStart,
          midOriginal,
          modifiedStart,
          midModified,
          quitEarlyArr
        );
        var rightChanges = [];
        if (!quitEarlyArr[0]) {
          rightChanges = this.ComputeDiffRecursive(
            midOriginal + 1,
            originalEnd,
            midModified + 1,
            modifiedEnd,
            quitEarlyArr
          );
        } else {
          // We did't have time to finish the first half, so we don't have time to compute this half.
          // Consider the entire rest of the sequence different.
          rightChanges = [
            new DiffChange(
              midOriginal + 1,
              originalEnd - (midOriginal + 1) + 1,
              midModified + 1,
              modifiedEnd - (midModified + 1) + 1
            ),
          ];
        }
        return this.ConcatenateChanges(leftChanges, rightChanges);
      }
      // If we hit here, we quit early, and so can't return anything meaningful
      return [
        new DiffChange(
          originalStart,
          originalEnd - originalStart + 1,
          modifiedStart,
          modifiedEnd - modifiedStart + 1
        ),
      ];
    };
    LcsDiff.prototype.WALKTRACE = function(
      diagonalForwardBase,
      diagonalForwardStart,
      diagonalForwardEnd,
      diagonalForwardOffset,
      diagonalReverseBase,
      diagonalReverseStart,
      diagonalReverseEnd,
      diagonalReverseOffset,
      forwardPoints,
      reversePoints,
      originalIndex,
      originalEnd,
      midOriginalArr,
      modifiedIndex,
      modifiedEnd,
      midModifiedArr,
      deltaIsEven,
      quitEarlyArr
    ) {
      var forwardChanges = null,
        reverseChanges = null;
      // First, walk backward through the forward diagonals history
      var changeHelper = new DiffChangeHelper();
      var diagonalMin = diagonalForwardStart;
      var diagonalMax = diagonalForwardEnd;
      var diagonalRelative = midOriginalArr[0] - midModifiedArr[0] - diagonalForwardOffset;
      var lastOriginalIndex = Number.MIN_VALUE;
      var historyIndex = this.m_forwardHistory.length - 1;
      var diagonal;
      do {
        // Get the diagonal index from the relative diagonal number
        diagonal = diagonalRelative + diagonalForwardBase;
        // Figure out where we came from
        if (
          diagonal === diagonalMin ||
          (diagonal < diagonalMax && forwardPoints[diagonal - 1] < forwardPoints[diagonal + 1])
        ) {
          // Vertical line (the element is an insert)
          originalIndex = forwardPoints[diagonal + 1];
          modifiedIndex = originalIndex - diagonalRelative - diagonalForwardOffset;
          if (originalIndex < lastOriginalIndex) {
            changeHelper.MarkNextChange();
          }
          lastOriginalIndex = originalIndex;
          changeHelper.AddModifiedElement(originalIndex + 1, modifiedIndex);
          diagonalRelative = diagonal + 1 - diagonalForwardBase; //Setup for the next iteration
        } else {
          // Horizontal line (the element is a deletion)
          originalIndex = forwardPoints[diagonal - 1] + 1;
          modifiedIndex = originalIndex - diagonalRelative - diagonalForwardOffset;
          if (originalIndex < lastOriginalIndex) {
            changeHelper.MarkNextChange();
          }
          lastOriginalIndex = originalIndex - 1;
          changeHelper.AddOriginalElement(originalIndex, modifiedIndex + 1);
          diagonalRelative = diagonal - 1 - diagonalForwardBase; //Setup for the next iteration
        }
        if (historyIndex >= 0) {
          forwardPoints = this.m_forwardHistory[historyIndex];
          diagonalForwardBase = forwardPoints[0]; //We stored this in the first spot
          diagonalMin = 1;
          diagonalMax = forwardPoints.length - 1;
        }
      } while (--historyIndex >= -1);
      // Ironically, we get the forward changes as the reverse of the
      // order we added them since we technically added them backwards
      forwardChanges = changeHelper.getReverseChanges();
      if (quitEarlyArr[0]) {
        // TODO: Calculate a partial from the reverse diagonals.
        //       For now, just assume everything after the midOriginal/midModified point is a diff
        var originalStartPoint = midOriginalArr[0] + 1;
        var modifiedStartPoint = midModifiedArr[0] + 1;
        if (forwardChanges !== null && forwardChanges.length > 0) {
          var lastForwardChange = forwardChanges[forwardChanges.length - 1];
          originalStartPoint = Math.max(originalStartPoint, lastForwardChange.getOriginalEnd());
          modifiedStartPoint = Math.max(modifiedStartPoint, lastForwardChange.getModifiedEnd());
        }
        reverseChanges = [
          new DiffChange(
            originalStartPoint,
            originalEnd - originalStartPoint + 1,
            modifiedStartPoint,
            modifiedEnd - modifiedStartPoint + 1
          ),
        ];
      } else {
        // Now walk backward through the reverse diagonals history
        changeHelper = new DiffChangeHelper();
        diagonalMin = diagonalReverseStart;
        diagonalMax = diagonalReverseEnd;
        diagonalRelative = midOriginalArr[0] - midModifiedArr[0] - diagonalReverseOffset;
        lastOriginalIndex = Number.MAX_VALUE;
        historyIndex = deltaIsEven
          ? this.m_reverseHistory.length - 1
          : this.m_reverseHistory.length - 2;
        do {
          // Get the diagonal index from the relative diagonal number
          diagonal = diagonalRelative + diagonalReverseBase;
          // Figure out where we came from
          if (
            diagonal === diagonalMin ||
            (diagonal < diagonalMax && reversePoints[diagonal - 1] >= reversePoints[diagonal + 1])
          ) {
            // Horizontal line (the element is a deletion))
            originalIndex = reversePoints[diagonal + 1] - 1;
            modifiedIndex = originalIndex - diagonalRelative - diagonalReverseOffset;
            if (originalIndex > lastOriginalIndex) {
              changeHelper.MarkNextChange();
            }
            lastOriginalIndex = originalIndex + 1;
            changeHelper.AddOriginalElement(originalIndex + 1, modifiedIndex + 1);
            diagonalRelative = diagonal + 1 - diagonalReverseBase; //Setup for the next iteration
          } else {
            // Vertical line (the element is an insertion)
            originalIndex = reversePoints[diagonal - 1];
            modifiedIndex = originalIndex - diagonalRelative - diagonalReverseOffset;
            if (originalIndex > lastOriginalIndex) {
              changeHelper.MarkNextChange();
            }
            lastOriginalIndex = originalIndex;
            changeHelper.AddModifiedElement(originalIndex + 1, modifiedIndex + 1);
            diagonalRelative = diagonal - 1 - diagonalReverseBase; //Setup for the next iteration
          }
          if (historyIndex >= 0) {
            reversePoints = this.m_reverseHistory[historyIndex];
            diagonalReverseBase = reversePoints[0]; //We stored this in the first spot
            diagonalMin = 1;
            diagonalMax = reversePoints.length - 1;
          }
        } while (--historyIndex >= -1);
        // There are cases where the reverse history will find diffs that
        // are correct, but not intuitive, so we need shift them.
        reverseChanges = changeHelper.getChanges();
      }
      return this.ConcatenateChanges(forwardChanges, reverseChanges);
    };
    /**
     * Given the range to compute the diff on, this method finds the point:
     * (midOriginal, midModified)
     * that exists in the middle of the LCS of the two sequences and
     * is the point at which the LCS problem may be broken down recursively.
     * This method will try to keep the LCS trace in memory. If the LCS recursion
     * point is calculated and the full trace is available in memory, then this method
     * will return the change list.
     * @param originalStart The start bound of the original sequence range
     * @param originalEnd The end bound of the original sequence range
     * @param modifiedStart The start bound of the modified sequence range
     * @param modifiedEnd The end bound of the modified sequence range
     * @param midOriginal The middle point of the original sequence range
     * @param midModified The middle point of the modified sequence range
     * @returns The diff changes, if available, otherwise null
     */
    LcsDiff.prototype.ComputeRecursionPoint = function(
      originalStart,
      originalEnd,
      modifiedStart,
      modifiedEnd,
      midOriginalArr,
      midModifiedArr,
      quitEarlyArr
    ) {
      var originalIndex = 0,
        modifiedIndex = 0;
      var diagonalForwardStart = 0,
        diagonalForwardEnd = 0;
      var diagonalReverseStart = 0,
        diagonalReverseEnd = 0;
      var numDifferences;
      // To traverse the edit graph and produce the proper LCS, our actual
      // start position is just outside the given boundary
      originalStart--;
      modifiedStart--;
      // We set these up to make the compiler happy, but they will
      // be replaced before we return with the actual recursion point
      midOriginalArr[0] = 0;
      midModifiedArr[0] = 0;
      // Clear out the history
      this.m_forwardHistory = [];
      this.m_reverseHistory = [];
      // Each cell in the two arrays corresponds to a diagonal in the edit graph.
      // The integer value in the cell represents the originalIndex of the furthest
      // reaching point found so far that ends in that diagonal.
      // The modifiedIndex can be computed mathematically from the originalIndex and the diagonal number.
      var maxDifferences = originalEnd - originalStart + (modifiedEnd - modifiedStart);
      var numDiagonals = maxDifferences + 1;
      var forwardPoints = new Array(numDiagonals);
      var reversePoints = new Array(numDiagonals);
      // diagonalForwardBase: Index into forwardPoints of the diagonal which passes through (originalStart, modifiedStart)
      // diagonalReverseBase: Index into reversePoints of the diagonal which passes through (originalEnd, modifiedEnd)
      var diagonalForwardBase = modifiedEnd - modifiedStart;
      var diagonalReverseBase = originalEnd - originalStart;
      // diagonalForwardOffset: Geometric offset which allows modifiedIndex to be computed from originalIndex and the
      //    diagonal number (relative to diagonalForwardBase)
      // diagonalReverseOffset: Geometric offset which allows modifiedIndex to be computed from originalIndex and the
      //    diagonal number (relative to diagonalReverseBase)
      var diagonalForwardOffset = originalStart - modifiedStart;
      var diagonalReverseOffset = originalEnd - modifiedEnd;
      // delta: The difference between the end diagonal and the start diagonal. This is used to relate diagonal numbers
      //   relative to the start diagonal with diagonal numbers relative to the end diagonal.
      // The Even/Oddn-ness of this delta is important for determining when we should check for overlap
      var delta = diagonalReverseBase - diagonalForwardBase;
      var deltaIsEven = delta % 2 === 0;
      // Here we set up the start and end points as the furthest points found so far
      // in both the forward and reverse directions, respectively
      forwardPoints[diagonalForwardBase] = originalStart;
      reversePoints[diagonalReverseBase] = originalEnd;
      // Remember if we quit early, and thus need to do a best-effort result instead of a real result.
      quitEarlyArr[0] = false;
      // A couple of points:
      // --With this method, we iterate on the number of differences between the two sequences.
      //   The more differences there actually are, the longer this will take.
      // --Also, as the number of differences increases, we have to search on diagonals further
      //   away from the reference diagonal (which is diagonalForwardBase for forward, diagonalReverseBase for reverse).
      // --We extend on even diagonals (relative to the reference diagonal) only when numDifferences
      //   is even and odd diagonals only when numDifferences is odd.
      var diagonal, tempOriginalIndex;
      for (numDifferences = 1; numDifferences <= maxDifferences / 2 + 1; numDifferences++) {
        var furthestOriginalIndex = 0;
        var furthestModifiedIndex = 0;
        // Run the algorithm in the forward direction
        diagonalForwardStart = this.ClipDiagonalBound(
          diagonalForwardBase - numDifferences,
          numDifferences,
          diagonalForwardBase,
          numDiagonals
        );
        diagonalForwardEnd = this.ClipDiagonalBound(
          diagonalForwardBase + numDifferences,
          numDifferences,
          diagonalForwardBase,
          numDiagonals
        );
        for (diagonal = diagonalForwardStart; diagonal <= diagonalForwardEnd; diagonal += 2) {
          // STEP 1: We extend the furthest reaching point in the present diagonal
          // by looking at the diagonals above and below and picking the one whose point
          // is further away from the start point (originalStart, modifiedStart)
          if (
            diagonal === diagonalForwardStart ||
            (diagonal < diagonalForwardEnd &&
              forwardPoints[diagonal - 1] < forwardPoints[diagonal + 1])
          ) {
            originalIndex = forwardPoints[diagonal + 1];
          } else {
            originalIndex = forwardPoints[diagonal - 1] + 1;
          }
          modifiedIndex = originalIndex - (diagonal - diagonalForwardBase) - diagonalForwardOffset;
          // Save the current originalIndex so we can test for false overlap in step 3
          tempOriginalIndex = originalIndex;
          // STEP 2: We can continue to extend the furthest reaching point in the present diagonal
          // so long as the elements are equal.
          while (
            originalIndex < originalEnd &&
            modifiedIndex < modifiedEnd &&
            this.ElementsAreEqual(originalIndex + 1, modifiedIndex + 1)
          ) {
            originalIndex++;
            modifiedIndex++;
          }
          forwardPoints[diagonal] = originalIndex;
          if (originalIndex + modifiedIndex > furthestOriginalIndex + furthestModifiedIndex) {
            furthestOriginalIndex = originalIndex;
            furthestModifiedIndex = modifiedIndex;
          }
          // STEP 3: If delta is odd (overlap first happens on forward when delta is odd)
          // and diagonal is in the range of reverse diagonals computed for numDifferences-1
          // (the previous iteration; we haven't computed reverse diagonals for numDifferences yet)
          // then check for overlap.
          if (!deltaIsEven && Math.abs(diagonal - diagonalReverseBase) <= numDifferences - 1) {
            if (originalIndex >= reversePoints[diagonal]) {
              midOriginalArr[0] = originalIndex;
              midModifiedArr[0] = modifiedIndex;
              if (
                tempOriginalIndex <= reversePoints[diagonal] &&
                MaxDifferencesHistory > 0 &&
                numDifferences <= MaxDifferencesHistory + 1
              ) {
                // BINGO! We overlapped, and we have the full trace in memory!
                return this.WALKTRACE(
                  diagonalForwardBase,
                  diagonalForwardStart,
                  diagonalForwardEnd,
                  diagonalForwardOffset,
                  diagonalReverseBase,
                  diagonalReverseStart,
                  diagonalReverseEnd,
                  diagonalReverseOffset,
                  forwardPoints,
                  reversePoints,
                  originalIndex,
                  originalEnd,
                  midOriginalArr,
                  modifiedIndex,
                  modifiedEnd,
                  midModifiedArr,
                  deltaIsEven,
                  quitEarlyArr
                );
              } else {
                // Either false overlap, or we didn't have enough memory for the full trace
                // Just return the recursion point
                return null;
              }
            }
          }
        }
        // Check to see if we should be quitting early, before moving on to the next iteration.
        var matchLengthOfLongest =
          (furthestOriginalIndex -
            originalStart +
            (furthestModifiedIndex - modifiedStart) -
            numDifferences) /
          2;
        if (
          this.ContinueProcessingPredicate !== null &&
          !this.ContinueProcessingPredicate(
            furthestOriginalIndex,
            this.OriginalSequence,
            matchLengthOfLongest
          )
        ) {
          // We can't finish, so skip ahead to generating a result from what we have.
          quitEarlyArr[0] = true;
          // Use the furthest distance we got in the forward direction.
          midOriginalArr[0] = furthestOriginalIndex;
          midModifiedArr[0] = furthestModifiedIndex;
          if (
            matchLengthOfLongest > 0 &&
            MaxDifferencesHistory > 0 &&
            numDifferences <= MaxDifferencesHistory + 1
          ) {
            // Enough of the history is in memory to walk it backwards
            return this.WALKTRACE(
              diagonalForwardBase,
              diagonalForwardStart,
              diagonalForwardEnd,
              diagonalForwardOffset,
              diagonalReverseBase,
              diagonalReverseStart,
              diagonalReverseEnd,
              diagonalReverseOffset,
              forwardPoints,
              reversePoints,
              originalIndex,
              originalEnd,
              midOriginalArr,
              modifiedIndex,
              modifiedEnd,
              midModifiedArr,
              deltaIsEven,
              quitEarlyArr
            );
          } else {
            // We didn't actually remember enough of the history.
            //Since we are quiting the diff early, we need to shift back the originalStart and modified start
            //back into the boundary limits since we decremented their value above beyond the boundary limit.
            originalStart++;
            modifiedStart++;
            return [
              new DiffChange(
                originalStart,
                originalEnd - originalStart + 1,
                modifiedStart,
                modifiedEnd - modifiedStart + 1
              ),
            ];
          }
        }
        // Run the algorithm in the reverse direction
        diagonalReverseStart = this.ClipDiagonalBound(
          diagonalReverseBase - numDifferences,
          numDifferences,
          diagonalReverseBase,
          numDiagonals
        );
        diagonalReverseEnd = this.ClipDiagonalBound(
          diagonalReverseBase + numDifferences,
          numDifferences,
          diagonalReverseBase,
          numDiagonals
        );
        for (diagonal = diagonalReverseStart; diagonal <= diagonalReverseEnd; diagonal += 2) {
          // STEP 1: We extend the furthest reaching point in the present diagonal
          // by looking at the diagonals above and below and picking the one whose point
          // is further away from the start point (originalEnd, modifiedEnd)
          if (
            diagonal === diagonalReverseStart ||
            (diagonal < diagonalReverseEnd &&
              reversePoints[diagonal - 1] >= reversePoints[diagonal + 1])
          ) {
            originalIndex = reversePoints[diagonal + 1] - 1;
          } else {
            originalIndex = reversePoints[diagonal - 1];
          }
          modifiedIndex = originalIndex - (diagonal - diagonalReverseBase) - diagonalReverseOffset;
          // Save the current originalIndex so we can test for false overlap
          tempOriginalIndex = originalIndex;
          // STEP 2: We can continue to extend the furthest reaching point in the present diagonal
          // as long as the elements are equal.
          while (
            originalIndex > originalStart &&
            modifiedIndex > modifiedStart &&
            this.ElementsAreEqual(originalIndex, modifiedIndex)
          ) {
            originalIndex--;
            modifiedIndex--;
          }
          reversePoints[diagonal] = originalIndex;
          // STEP 4: If delta is even (overlap first happens on reverse when delta is even)
          // and diagonal is in the range of forward diagonals computed for numDifferences
          // then check for overlap.
          if (deltaIsEven && Math.abs(diagonal - diagonalForwardBase) <= numDifferences) {
            if (originalIndex <= forwardPoints[diagonal]) {
              midOriginalArr[0] = originalIndex;
              midModifiedArr[0] = modifiedIndex;
              if (
                tempOriginalIndex >= forwardPoints[diagonal] &&
                MaxDifferencesHistory > 0 &&
                numDifferences <= MaxDifferencesHistory + 1
              ) {
                // BINGO! We overlapped, and we have the full trace in memory!
                return this.WALKTRACE(
                  diagonalForwardBase,
                  diagonalForwardStart,
                  diagonalForwardEnd,
                  diagonalForwardOffset,
                  diagonalReverseBase,
                  diagonalReverseStart,
                  diagonalReverseEnd,
                  diagonalReverseOffset,
                  forwardPoints,
                  reversePoints,
                  originalIndex,
                  originalEnd,
                  midOriginalArr,
                  modifiedIndex,
                  modifiedEnd,
                  midModifiedArr,
                  deltaIsEven,
                  quitEarlyArr
                );
              } else {
                // Either false overlap, or we didn't have enough memory for the full trace
                // Just return the recursion point
                return null;
              }
            }
          }
        }
        // Save current vectors to history before the next iteration
        if (numDifferences <= MaxDifferencesHistory) {
          // We are allocating space for one extra int, which we fill with
          // the index of the diagonal base index
          var temp = new Array(diagonalForwardEnd - diagonalForwardStart + 2);
          temp[0] = diagonalForwardBase - diagonalForwardStart + 1;
          MyArray.Copy(
            forwardPoints,
            diagonalForwardStart,
            temp,
            1,
            diagonalForwardEnd - diagonalForwardStart + 1
          );
          this.m_forwardHistory.push(temp);
          temp = new Array(diagonalReverseEnd - diagonalReverseStart + 2);
          temp[0] = diagonalReverseBase - diagonalReverseStart + 1;
          MyArray.Copy(
            reversePoints,
            diagonalReverseStart,
            temp,
            1,
            diagonalReverseEnd - diagonalReverseStart + 1
          );
          this.m_reverseHistory.push(temp);
        }
      }
      // If we got here, then we have the full trace in history. We just have to convert it to a change list
      // NOTE: This part is a bit messy
      return this.WALKTRACE(
        diagonalForwardBase,
        diagonalForwardStart,
        diagonalForwardEnd,
        diagonalForwardOffset,
        diagonalReverseBase,
        diagonalReverseStart,
        diagonalReverseEnd,
        diagonalReverseOffset,
        forwardPoints,
        reversePoints,
        originalIndex,
        originalEnd,
        midOriginalArr,
        modifiedIndex,
        modifiedEnd,
        midModifiedArr,
        deltaIsEven,
        quitEarlyArr
      );
    };
    /**
     * Shifts the given changes to provide a more intuitive diff.
     * While the first element in a diff matches the first element after the diff,
     * we shift the diff down.
     *
     * @param changes The list of changes to shift
     * @returns The shifted changes
     */
    LcsDiff.prototype.PrettifyChanges = function(changes) {
      // Shift all the changes down first
      for (var i = 0; i < changes.length; i++) {
        var change = changes[i];
        var originalStop =
          i < changes.length - 1 ? changes[i + 1].originalStart : this.OriginalSequence.getLength();
        var modifiedStop =
          i < changes.length - 1 ? changes[i + 1].modifiedStart : this.ModifiedSequence.getLength();
        var checkOriginal = change.originalLength > 0;
        var checkModified = change.modifiedLength > 0;
        while (
          change.originalStart + change.originalLength < originalStop &&
          change.modifiedStart + change.modifiedLength < modifiedStop &&
          (!checkOriginal ||
            this.OriginalElementsAreEqual(
              change.originalStart,
              change.originalStart + change.originalLength
            )) &&
          (!checkModified ||
            this.ModifiedElementsAreEqual(
              change.modifiedStart,
              change.modifiedStart + change.modifiedLength
            ))
        ) {
          change.originalStart++;
          change.modifiedStart++;
        }
        var mergedChangeArr = [null];
        if (
          i < changes.length - 1 &&
          this.ChangesOverlap(changes[i], changes[i + 1], mergedChangeArr)
        ) {
          changes[i] = mergedChangeArr[0];
          changes.splice(i + 1, 1);
          i--;
          continue;
        }
      }
      // Shift changes back up until we hit empty or whitespace-only lines
      for (var i = changes.length - 1; i >= 0; i--) {
        var change = changes[i];
        var originalStop = 0;
        var modifiedStop = 0;
        if (i > 0) {
          var prevChange = changes[i - 1];
          if (prevChange.originalLength > 0) {
            originalStop = prevChange.originalStart + prevChange.originalLength;
          }
          if (prevChange.modifiedLength > 0) {
            modifiedStop = prevChange.modifiedStart + prevChange.modifiedLength;
          }
        }
        var checkOriginal = change.originalLength > 0;
        var checkModified = change.modifiedLength > 0;
        var bestDelta = 0;
        var bestScore = this._boundaryScore(
          change.originalStart,
          change.originalLength,
          change.modifiedStart,
          change.modifiedLength
        );
        for (var delta = 1; ; delta++) {
          var originalStart = change.originalStart - delta;
          var modifiedStart = change.modifiedStart - delta;
          if (originalStart < originalStop || modifiedStart < modifiedStop) {
            break;
          }
          if (
            checkOriginal &&
            !this.OriginalElementsAreEqual(originalStart, originalStart + change.originalLength)
          ) {
            break;
          }
          if (
            checkModified &&
            !this.ModifiedElementsAreEqual(modifiedStart, modifiedStart + change.modifiedLength)
          ) {
            break;
          }
          var score = this._boundaryScore(
            originalStart,
            change.originalLength,
            modifiedStart,
            change.modifiedLength
          );
          if (score > bestScore) {
            bestScore = score;
            bestDelta = delta;
          }
        }
        change.originalStart -= bestDelta;
        change.modifiedStart -= bestDelta;
      }
      return changes;
    };
    LcsDiff.prototype._OriginalIsBoundary = function(index) {
      if (index <= 0 || index >= this.OriginalSequence.getLength() - 1) {
        return true;
      }
      var element = this.OriginalSequence.getElementAtIndex(index);
      return typeof element === 'string' && /^\s*$/.test(element);
    };
    LcsDiff.prototype._OriginalRegionIsBoundary = function(originalStart, originalLength) {
      if (this._OriginalIsBoundary(originalStart) || this._OriginalIsBoundary(originalStart - 1)) {
        return true;
      }
      if (originalLength > 0) {
        var originalEnd = originalStart + originalLength;
        if (this._OriginalIsBoundary(originalEnd - 1) || this._OriginalIsBoundary(originalEnd)) {
          return true;
        }
      }
      return false;
    };
    LcsDiff.prototype._ModifiedIsBoundary = function(index) {
      if (index <= 0 || index >= this.ModifiedSequence.getLength() - 1) {
        return true;
      }
      var element = this.ModifiedSequence.getElementAtIndex(index);
      return typeof element === 'string' && /^\s*$/.test(element);
    };
    LcsDiff.prototype._ModifiedRegionIsBoundary = function(modifiedStart, modifiedLength) {
      if (this._ModifiedIsBoundary(modifiedStart) || this._ModifiedIsBoundary(modifiedStart - 1)) {
        return true;
      }
      if (modifiedLength > 0) {
        var modifiedEnd = modifiedStart + modifiedLength;
        if (this._ModifiedIsBoundary(modifiedEnd - 1) || this._ModifiedIsBoundary(modifiedEnd)) {
          return true;
        }
      }
      return false;
    };
    LcsDiff.prototype._boundaryScore = function(
      originalStart,
      originalLength,
      modifiedStart,
      modifiedLength
    ) {
      var originalScore = this._OriginalRegionIsBoundary(originalStart, originalLength) ? 1 : 0;
      var modifiedScore = this._ModifiedRegionIsBoundary(modifiedStart, modifiedLength) ? 1 : 0;
      return originalScore + modifiedScore;
    };
    /**
     * Concatenates the two input DiffChange lists and returns the resulting
     * list.
     * @param The left changes
     * @param The right changes
     * @returns The concatenated list
     */
    LcsDiff.prototype.ConcatenateChanges = function(left, right) {
      var mergedChangeArr = [];
      if (left.length === 0 || right.length === 0) {
        return right.length > 0 ? right : left;
      } else if (this.ChangesOverlap(left[left.length - 1], right[0], mergedChangeArr)) {
        // Since we break the problem down recursively, it is possible that we
        // might recurse in the middle of a change thereby splitting it into
        // two changes. Here in the combining stage, we detect and fuse those
        // changes back together
        var result = new Array(left.length + right.length - 1);
        MyArray.Copy(left, 0, result, 0, left.length - 1);
        result[left.length - 1] = mergedChangeArr[0];
        MyArray.Copy(right, 1, result, left.length, right.length - 1);
        return result;
      } else {
        var result = new Array(left.length + right.length);
        MyArray.Copy(left, 0, result, 0, left.length);
        MyArray.Copy(right, 0, result, left.length, right.length);
        return result;
      }
    };
    /**
     * Returns true if the two changes overlap and can be merged into a single
     * change
     * @param left The left change
     * @param right The right change
     * @param mergedChange The merged change if the two overlap, null otherwise
     * @returns True if the two changes overlap
     */
    LcsDiff.prototype.ChangesOverlap = function(left, right, mergedChangeArr) {
      Debug.Assert(
        left.originalStart <= right.originalStart,
        'Left change is not less than or equal to right change'
      );
      Debug.Assert(
        left.modifiedStart <= right.modifiedStart,
        'Left change is not less than or equal to right change'
      );
      if (
        left.originalStart + left.originalLength >= right.originalStart ||
        left.modifiedStart + left.modifiedLength >= right.modifiedStart
      ) {
        var originalStart = left.originalStart;
        var originalLength = left.originalLength;
        var modifiedStart = left.modifiedStart;
        var modifiedLength = left.modifiedLength;
        if (left.originalStart + left.originalLength >= right.originalStart) {
          originalLength = right.originalStart + right.originalLength - left.originalStart;
        }
        if (left.modifiedStart + left.modifiedLength >= right.modifiedStart) {
          modifiedLength = right.modifiedStart + right.modifiedLength - left.modifiedStart;
        }
        mergedChangeArr[0] = new DiffChange(
          originalStart,
          originalLength,
          modifiedStart,
          modifiedLength
        );
        return true;
      } else {
        mergedChangeArr[0] = null;
        return false;
      }
    };
    /**
     * Helper method used to clip a diagonal index to the range of valid
     * diagonals. This also decides whether or not the diagonal index,
     * if it exceeds the boundary, should be clipped to the boundary or clipped
     * one inside the boundary depending on the Even/Odd status of the boundary
     * and numDifferences.
     * @param diagonal The index of the diagonal to clip.
     * @param numDifferences The current number of differences being iterated upon.
     * @param diagonalBaseIndex The base reference diagonal.
     * @param numDiagonals The total number of diagonals.
     * @returns The clipped diagonal index.
     */
    LcsDiff.prototype.ClipDiagonalBound = function(
      diagonal,
      numDifferences,
      diagonalBaseIndex,
      numDiagonals
    ) {
      if (diagonal >= 0 && diagonal < numDiagonals) {
        // Nothing to clip, its in range
        return diagonal;
      }
      // diagonalsBelow: The number of diagonals below the reference diagonal
      // diagonalsAbove: The number of diagonals above the reference diagonal
      var diagonalsBelow = diagonalBaseIndex;
      var diagonalsAbove = numDiagonals - diagonalBaseIndex - 1;
      var diffEven = numDifferences % 2 === 0;
      if (diagonal < 0) {
        var lowerBoundEven = diagonalsBelow % 2 === 0;
        return diffEven === lowerBoundEven ? 0 : 1;
      } else {
        var upperBoundEven = diagonalsAbove % 2 === 0;
        return diffEven === upperBoundEven ? numDiagonals - 1 : numDiagonals - 2;
      }
    };
    return LcsDiff;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var __extends$1 =
    (undefined && undefined.__extends) ||
    (function() {
      var extendStatics = function(d, b) {
        extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function(d, b) {
              d.__proto__ = b;
            }) ||
          function(d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();
  var FIN = { done: true, value: undefined };
  var Iterator;
  (function(Iterator) {
    var _empty = {
      next: function() {
        return FIN;
      },
    };
    function empty() {
      return _empty;
    }
    Iterator.empty = empty;
    function fromArray(array, index, length) {
      if (index === void 0) {
        index = 0;
      }
      if (length === void 0) {
        length = array.length;
      }
      return {
        next: function() {
          if (index >= length) {
            return FIN;
          }
          return { done: false, value: array[index++] };
        },
      };
    }
    Iterator.fromArray = fromArray;
    function from(elements) {
      if (!elements) {
        return Iterator.empty();
      } else if (Array.isArray(elements)) {
        return Iterator.fromArray(elements);
      } else {
        return elements;
      }
    }
    Iterator.from = from;
    function map(iterator, fn) {
      return {
        next: function() {
          var element = iterator.next();
          if (element.done) {
            return FIN;
          } else {
            return { done: false, value: fn(element.value) };
          }
        },
      };
    }
    Iterator.map = map;
    function filter(iterator, fn) {
      return {
        next: function() {
          while (true) {
            var element = iterator.next();
            if (element.done) {
              return FIN;
            }
            if (fn(element.value)) {
              return { done: false, value: element.value };
            }
          }
        },
      };
    }
    Iterator.filter = filter;
    function forEach(iterator, fn) {
      for (var next = iterator.next(); !next.done; next = iterator.next()) {
        fn(next.value);
      }
    }
    Iterator.forEach = forEach;
    function collect(iterator) {
      var result = [];
      forEach(iterator, function(value) {
        return result.push(value);
      });
      return result;
    }
    Iterator.collect = collect;
  })(Iterator || (Iterator = {}));
  var ArrayIterator = /** @class */ (function() {
    function ArrayIterator(items, start, end, index) {
      if (start === void 0) {
        start = 0;
      }
      if (end === void 0) {
        end = items.length;
      }
      if (index === void 0) {
        index = start - 1;
      }
      this.items = items;
      this.start = start;
      this.end = end;
      this.index = index;
    }
    ArrayIterator.prototype.next = function() {
      this.index = Math.min(this.index + 1, this.end);
      return this.current();
    };
    ArrayIterator.prototype.current = function() {
      if (this.index === this.start - 1 || this.index === this.end) {
        return null;
      }
      return this.items[this.index];
    };
    return ArrayIterator;
  })();
  var ArrayNavigator = /** @class */ (function(_super) {
    __extends$1(ArrayNavigator, _super);
    function ArrayNavigator(items, start, end, index) {
      if (start === void 0) {
        start = 0;
      }
      if (end === void 0) {
        end = items.length;
      }
      if (index === void 0) {
        index = start - 1;
      }
      return _super.call(this, items, start, end, index) || this;
    }
    ArrayNavigator.prototype.current = function() {
      return _super.prototype.current.call(this);
    };
    ArrayNavigator.prototype.previous = function() {
      this.index = Math.max(this.index - 1, this.start - 1);
      return this.current();
    };
    ArrayNavigator.prototype.first = function() {
      this.index = this.start;
      return this.current();
    };
    ArrayNavigator.prototype.last = function() {
      this.index = this.end - 1;
      return this.current();
    };
    ArrayNavigator.prototype.parent = function() {
      return null;
    };
    return ArrayNavigator;
  })(ArrayIterator);

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var __extends$2 =
    (undefined && undefined.__extends) ||
    (function() {
      var extendStatics = function(d, b) {
        extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function(d, b) {
              d.__proto__ = b;
            }) ||
          function(d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();
  var _a;
  var _schemePattern = /^\w[\w\d+.-]*$/;
  var _singleSlashStart = /^\//;
  var _doubleSlashStart = /^\/\//;
  var _throwOnMissingSchema = true;
  function _validateUri(ret, _strict) {
    // scheme, must be set
    if (!ret.scheme) {
      if (_strict || _throwOnMissingSchema) {
        throw new Error(
          '[UriError]: Scheme is missing: {scheme: "", authority: "' +
            ret.authority +
            '", path: "' +
            ret.path +
            '", query: "' +
            ret.query +
            '", fragment: "' +
            ret.fragment +
            '"}'
        );
      } else {
        console.warn(
          '[UriError]: Scheme is missing: {scheme: "", authority: "' +
            ret.authority +
            '", path: "' +
            ret.path +
            '", query: "' +
            ret.query +
            '", fragment: "' +
            ret.fragment +
            '"}'
        );
      }
    }
    // scheme, https://tools.ietf.org/html/rfc3986#section-3.1
    // ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    if (ret.scheme && !_schemePattern.test(ret.scheme)) {
      throw new Error('[UriError]: Scheme contains illegal characters.');
    }
    // path, http://tools.ietf.org/html/rfc3986#section-3.3
    // If a URI contains an authority component, then the path component
    // must either be empty or begin with a slash ("/") character.  If a URI
    // does not contain an authority component, then the path cannot begin
    // with two slash characters ("//").
    if (ret.path) {
      if (ret.authority) {
        if (!_singleSlashStart.test(ret.path)) {
          throw new Error(
            '[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character'
          );
        }
      } else {
        if (_doubleSlashStart.test(ret.path)) {
          throw new Error(
            '[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")'
          );
        }
      }
    }
  }
  // for a while we allowed uris *without* schemes and this is the migration
  // for them, e.g. an uri without scheme and without strict-mode warns and falls
  // back to the file-scheme. that should cause the least carnage and still be a
  // clear warning
  function _schemeFix(scheme, _strict) {
    if (_strict || _throwOnMissingSchema) {
      return scheme || _empty;
    }
    if (!scheme) {
      console.trace('BAD uri lacks scheme, falling back to file-scheme.');
      scheme = 'file';
    }
    return scheme;
  }
  // implements a bit of https://tools.ietf.org/html/rfc3986#section-5
  function _referenceResolution(scheme, path) {
    // the slash-character is our 'default base' as we don't
    // support constructing URIs relative to other URIs. This
    // also means that we alter and potentially break paths.
    // see https://tools.ietf.org/html/rfc3986#section-5.1.4
    switch (scheme) {
      case 'https':
      case 'http':
      case 'file':
        if (!path) {
          path = _slash;
        } else if (path[0] !== _slash) {
          path = _slash + path;
        }
        break;
    }
    return path;
  }
  var _empty = '';
  var _slash = '/';
  var _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
  /**
   * Uniform Resource Identifier (URI) http://tools.ietf.org/html/rfc3986.
   * This class is a simple parser which creates the basic component parts
   * (http://tools.ietf.org/html/rfc3986#section-3) with minimal validation
   * and encoding.
   *
   *       foo://example.com:8042/over/there?name=ferret#nose
   *       \_/   \______________/\_________/ \_________/ \__/
   *        |           |            |            |        |
   *     scheme     authority       path        query   fragment
   *        |   _____________________|__
   *       / \ /                        \
   *       urn:example:animal:ferret:nose
   */
  var URI = /** @class */ (function() {
    /**
     * @internal
     */
    function URI(schemeOrData, authority, path, query, fragment, _strict) {
      if (_strict === void 0) {
        _strict = false;
      }
      if (typeof schemeOrData === 'object') {
        this.scheme = schemeOrData.scheme || _empty;
        this.authority = schemeOrData.authority || _empty;
        this.path = schemeOrData.path || _empty;
        this.query = schemeOrData.query || _empty;
        this.fragment = schemeOrData.fragment || _empty;
        // no validation because it's this URI
        // that creates uri components.
        // _validateUri(this);
      } else {
        this.scheme = _schemeFix(schemeOrData, _strict);
        this.authority = authority || _empty;
        this.path = _referenceResolution(this.scheme, path || _empty);
        this.query = query || _empty;
        this.fragment = fragment || _empty;
        _validateUri(this, _strict);
      }
    }
    URI.isUri = function(thing) {
      if (thing instanceof URI) {
        return true;
      }
      if (!thing) {
        return false;
      }
      return (
        typeof thing.authority === 'string' &&
        typeof thing.fragment === 'string' &&
        typeof thing.path === 'string' &&
        typeof thing.query === 'string' &&
        typeof thing.scheme === 'string' &&
        typeof thing.fsPath === 'function' &&
        typeof thing.with === 'function' &&
        typeof thing.toString === 'function'
      );
    };
    Object.defineProperty(URI.prototype, 'fsPath', {
      // ---- filesystem path -----------------------
      /**
       * Returns a string representing the corresponding file system path of this URI.
       * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
       * platform specific path separator.
       *
       * * Will *not* validate the path for invalid characters and semantics.
       * * Will *not* look at the scheme of this URI.
       * * The result shall *not* be used for display purposes but for accessing a file on disk.
       *
       *
       * The *difference* to `URI#path` is the use of the platform specific separator and the handling
       * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
       *
       * ```ts
       const u = URI.parse('file://server/c$/folder/file.txt')
       u.authority === 'server'
       u.path === '/shares/c$/file.txt'
       u.fsPath === '\\server\c$\folder\file.txt'
       ```
       *
       * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
       * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
       * with URIs that represent files on disk (`file` scheme).
       */
      get: function() {
        // if (this.scheme !== 'file') {
        // 	console.warn(`[UriError] calling fsPath with scheme ${this.scheme}`);
        // }
        return _makeFsPath(this);
      },
      enumerable: true,
      configurable: true,
    });
    // ---- modify to new -------------------------
    URI.prototype.with = function(change) {
      if (!change) {
        return this;
      }
      var scheme = change.scheme,
        authority = change.authority,
        path = change.path,
        query = change.query,
        fragment = change.fragment;
      if (scheme === undefined) {
        scheme = this.scheme;
      } else if (scheme === null) {
        scheme = _empty;
      }
      if (authority === undefined) {
        authority = this.authority;
      } else if (authority === null) {
        authority = _empty;
      }
      if (path === undefined) {
        path = this.path;
      } else if (path === null) {
        path = _empty;
      }
      if (query === undefined) {
        query = this.query;
      } else if (query === null) {
        query = _empty;
      }
      if (fragment === undefined) {
        fragment = this.fragment;
      } else if (fragment === null) {
        fragment = _empty;
      }
      if (
        scheme === this.scheme &&
        authority === this.authority &&
        path === this.path &&
        query === this.query &&
        fragment === this.fragment
      ) {
        return this;
      }
      return new _URI(scheme, authority, path, query, fragment);
    };
    // ---- parse & validate ------------------------
    /**
     * Creates a new URI from a string, e.g. `http://www.msft.com/some/path`,
     * `file:///usr/home`, or `scheme:with/path`.
     *
     * @param value A string which represents an URI (see `URI#toString`).
     */
    URI.parse = function(value, _strict) {
      if (_strict === void 0) {
        _strict = false;
      }
      var match = _regexp.exec(value);
      if (!match) {
        return new _URI(_empty, _empty, _empty, _empty, _empty);
      }
      return new _URI(
        match[2] || _empty,
        decodeURIComponent(match[4] || _empty),
        decodeURIComponent(match[5] || _empty),
        decodeURIComponent(match[7] || _empty),
        decodeURIComponent(match[9] || _empty),
        _strict
      );
    };
    /**
     * Creates a new URI from a file system path, e.g. `c:\my\files`,
     * `/usr/home`, or `\\server\share\some\path`.
     *
     * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
     * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
     * `URI.parse('file://' + path)` because the path might contain characters that are
     * interpreted (# and ?). See the following sample:
     * ```ts
     const good = URI.file('/coding/c#/project1');
     good.scheme === 'file';
     good.path === '/coding/c#/project1';
     good.fragment === '';
     const bad = URI.parse('file://' + '/coding/c#/project1');
     bad.scheme === 'file';
     bad.path === '/coding/c'; // path is now broken
     bad.fragment === '/project1';
     ```
     *
     * @param path A file system path (see `URI#fsPath`)
     */
    URI.file = function(path) {
      var authority = _empty;
      // normalize to fwd-slashes on windows,
      // on other systems bwd-slashes are valid
      // filename character, eg /f\oo/ba\r.txt
      if (isWindows) {
        path = path.replace(/\\/g, _slash);
      }
      // check for authority as used in UNC shares
      // or use the path as given
      if (path[0] === _slash && path[1] === _slash) {
        var idx = path.indexOf(_slash, 2);
        if (idx === -1) {
          authority = path.substring(2);
          path = _slash;
        } else {
          authority = path.substring(2, idx);
          path = path.substring(idx) || _slash;
        }
      }
      return new _URI('file', authority, path, _empty, _empty);
    };
    URI.from = function(components) {
      return new _URI(
        components.scheme,
        components.authority,
        components.path,
        components.query,
        components.fragment
      );
    };
    // ---- printing/externalize ---------------------------
    /**
     * Creates a string representation for this URI. It's guaranteed that calling
     * `URI.parse` with the result of this function creates an URI which is equal
     * to this URI.
     *
     * * The result shall *not* be used for display purposes but for externalization or transport.
     * * The result will be encoded using the percentage encoding and encoding happens mostly
     * ignore the scheme-specific encoding rules.
     *
     * @param skipEncoding Do not encode the result, default is `false`
     */
    URI.prototype.toString = function(skipEncoding) {
      if (skipEncoding === void 0) {
        skipEncoding = false;
      }
      return _asFormatted(this, skipEncoding);
    };
    URI.prototype.toJSON = function() {
      return this;
    };
    URI.revive = function(data) {
      if (!data) {
        return data;
      } else if (data instanceof URI) {
        return data;
      } else {
        var result = new _URI(data);
        result._fsPath = data.fsPath;
        result._formatted = data.external;
        return result;
      }
    };
    return URI;
  })();
  // tslint:disable-next-line:class-name
  var _URI = /** @class */ (function(_super) {
    __extends$2(_URI, _super);
    function _URI() {
      var _this = (_super !== null && _super.apply(this, arguments)) || this;
      _this._formatted = null;
      _this._fsPath = null;
      return _this;
    }
    Object.defineProperty(_URI.prototype, 'fsPath', {
      get: function() {
        if (!this._fsPath) {
          this._fsPath = _makeFsPath(this);
        }
        return this._fsPath;
      },
      enumerable: true,
      configurable: true,
    });
    _URI.prototype.toString = function(skipEncoding) {
      if (skipEncoding === void 0) {
        skipEncoding = false;
      }
      if (!skipEncoding) {
        if (!this._formatted) {
          this._formatted = _asFormatted(this, false);
        }
        return this._formatted;
      } else {
        // we don't cache that
        return _asFormatted(this, true);
      }
    };
    _URI.prototype.toJSON = function() {
      var res = {
        $mid: 1,
      };
      // cached state
      if (this._fsPath) {
        res.fsPath = this._fsPath;
      }
      if (this._formatted) {
        res.external = this._formatted;
      }
      // uri components
      if (this.path) {
        res.path = this.path;
      }
      if (this.scheme) {
        res.scheme = this.scheme;
      }
      if (this.authority) {
        res.authority = this.authority;
      }
      if (this.query) {
        res.query = this.query;
      }
      if (this.fragment) {
        res.fragment = this.fragment;
      }
      return res;
    };
    return _URI;
  })(URI);
  // reserved characters: https://tools.ietf.org/html/rfc3986#section-2.2
  var encodeTable =
    ((_a = {}),
    (_a[58 /* Colon */] = '%3A'),
    (_a[47 /* Slash */] = '%2F'),
    (_a[63 /* QuestionMark */] = '%3F'),
    (_a[35 /* Hash */] = '%23'),
    (_a[91 /* OpenSquareBracket */] = '%5B'),
    (_a[93 /* CloseSquareBracket */] = '%5D'),
    (_a[64 /* AtSign */] = '%40'),
    (_a[33 /* ExclamationMark */] = '%21'),
    (_a[36 /* DollarSign */] = '%24'),
    (_a[38 /* Ampersand */] = '%26'),
    (_a[39 /* SingleQuote */] = '%27'),
    (_a[40 /* OpenParen */] = '%28'),
    (_a[41 /* CloseParen */] = '%29'),
    (_a[42 /* Asterisk */] = '%2A'),
    (_a[43 /* Plus */] = '%2B'),
    (_a[44 /* Comma */] = '%2C'),
    (_a[59 /* Semicolon */] = '%3B'),
    (_a[61 /* Equals */] = '%3D'),
    (_a[32 /* Space */] = '%20'),
    _a);
  function encodeURIComponentFast(uriComponent, allowSlash) {
    var res = undefined;
    var nativeEncodePos = -1;
    for (var pos = 0; pos < uriComponent.length; pos++) {
      var code = uriComponent.charCodeAt(pos);
      // unreserved characters: https://tools.ietf.org/html/rfc3986#section-2.3
      if (
        (code >= 97 /* a */ && code <= 122) /* z */ ||
        (code >= 65 /* A */ && code <= 90) /* Z */ ||
        (code >= 48 /* Digit0 */ && code <= 57) /* Digit9 */ ||
        code === 45 /* Dash */ ||
        code === 46 /* Period */ ||
        code === 95 /* Underline */ ||
        code === 126 /* Tilde */ ||
        (allowSlash && code === 47) /* Slash */
      ) {
        // check if we are delaying native encode
        if (nativeEncodePos !== -1) {
          res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
          nativeEncodePos = -1;
        }
        // check if we write into a new string (by default we try to return the param)
        if (res !== undefined) {
          res += uriComponent.charAt(pos);
        }
      } else {
        // encoding needed, we need to allocate a new string
        if (res === undefined) {
          res = uriComponent.substr(0, pos);
        }
        // check with default table first
        var escaped = encodeTable[code];
        if (escaped !== undefined) {
          // check if we are delaying native encode
          if (nativeEncodePos !== -1) {
            res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
            nativeEncodePos = -1;
          }
          // append escaped variant to result
          res += escaped;
        } else if (nativeEncodePos === -1) {
          // use native encode only when needed
          nativeEncodePos = pos;
        }
      }
    }
    if (nativeEncodePos !== -1) {
      res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
    }
    return res !== undefined ? res : uriComponent;
  }
  function encodeURIComponentMinimal(path) {
    var res = undefined;
    for (var pos = 0; pos < path.length; pos++) {
      var code = path.charCodeAt(pos);
      if (code === 35 /* Hash */ || code === 63 /* QuestionMark */) {
        if (res === undefined) {
          res = path.substr(0, pos);
        }
        res += encodeTable[code];
      } else {
        if (res !== undefined) {
          res += path[pos];
        }
      }
    }
    return res !== undefined ? res : path;
  }
  /**
   * Compute `fsPath` for the given uri
   */
  function _makeFsPath(uri) {
    var value;
    if (uri.authority && uri.path.length > 1 && uri.scheme === 'file') {
      // unc path: file://shares/c$/far/boo
      value = '//' + uri.authority + uri.path;
    } else if (
      uri.path.charCodeAt(0) === 47 /* Slash */ &&
      ((uri.path.charCodeAt(1) >= 65 /* A */ && uri.path.charCodeAt(1) <= 90) /* Z */ ||
        (uri.path.charCodeAt(1) >= 97 /* a */ && uri.path.charCodeAt(1) <= 122)) /* z */ &&
      uri.path.charCodeAt(2) === 58 /* Colon */
    ) {
      // windows drive letter: file:///c:/far/boo
      value = uri.path[1].toLowerCase() + uri.path.substr(2);
    } else {
      // other path
      value = uri.path;
    }
    if (isWindows) {
      value = value.replace(/\//g, '\\');
    }
    return value;
  }
  /**
   * Create the external version of a uri
   */
  function _asFormatted(uri, skipEncoding) {
    var encoder = !skipEncoding ? encodeURIComponentFast : encodeURIComponentMinimal;
    var res = '';
    var scheme = uri.scheme,
      authority = uri.authority,
      path = uri.path,
      query = uri.query,
      fragment = uri.fragment;
    if (scheme) {
      res += scheme;
      res += ':';
    }
    if (authority || scheme === 'file') {
      res += _slash;
      res += _slash;
    }
    if (authority) {
      var idx = authority.indexOf('@');
      if (idx !== -1) {
        // <user>@<auth>
        var userinfo = authority.substr(0, idx);
        authority = authority.substr(idx + 1);
        idx = userinfo.indexOf(':');
        if (idx === -1) {
          res += encoder(userinfo, false);
        } else {
          // <user>:<pass>@<auth>
          res += encoder(userinfo.substr(0, idx), false);
          res += ':';
          res += encoder(userinfo.substr(idx + 1), false);
        }
        res += '@';
      }
      authority = authority.toLowerCase();
      idx = authority.indexOf(':');
      if (idx === -1) {
        res += encoder(authority, false);
      } else {
        // <auth>:<port>
        res += encoder(authority.substr(0, idx), false);
        res += authority.substr(idx);
      }
    }
    if (path) {
      // lower-case windows drive letters in /C:/fff or C:/fff
      if (
        path.length >= 3 &&
        path.charCodeAt(0) === 47 /* Slash */ &&
        path.charCodeAt(2) === 58 /* Colon */
      ) {
        var code = path.charCodeAt(1);
        if (code >= 65 /* A */ && code <= 90 /* Z */) {
          path = '/' + String.fromCharCode(code + 32) + ':' + path.substr(3); // "/c:".length === 3
        }
      } else if (path.length >= 2 && path.charCodeAt(1) === 58 /* Colon */) {
        var code = path.charCodeAt(0);
        if (code >= 65 /* A */ && code <= 90 /* Z */) {
          path = String.fromCharCode(code + 32) + ':' + path.substr(2); // "/c:".length === 3
        }
      }
      // encode the rest of the path
      res += encoder(path, true);
    }
    if (query) {
      res += '?';
      res += encoder(query, false);
    }
    if (fragment) {
      res += '#';
      res += !skipEncoding ? encodeURIComponentFast(fragment, false) : fragment;
    }
    return res;
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  /**
   * A position in the editor.
   */
  var Position = /** @class */ (function() {
    function Position(lineNumber, column) {
      this.lineNumber = lineNumber;
      this.column = column;
    }
    /**
     * Create a new postion from this position.
     *
     * @param newLineNumber new line number
     * @param newColumn new column
     */
    Position.prototype.with = function(newLineNumber, newColumn) {
      if (newLineNumber === void 0) {
        newLineNumber = this.lineNumber;
      }
      if (newColumn === void 0) {
        newColumn = this.column;
      }
      if (newLineNumber === this.lineNumber && newColumn === this.column) {
        return this;
      } else {
        return new Position(newLineNumber, newColumn);
      }
    };
    /**
     * Derive a new position from this position.
     *
     * @param deltaLineNumber line number delta
     * @param deltaColumn column delta
     */
    Position.prototype.delta = function(deltaLineNumber, deltaColumn) {
      if (deltaLineNumber === void 0) {
        deltaLineNumber = 0;
      }
      if (deltaColumn === void 0) {
        deltaColumn = 0;
      }
      return this.with(this.lineNumber + deltaLineNumber, this.column + deltaColumn);
    };
    /**
     * Test if this position equals other position
     */
    Position.prototype.equals = function(other) {
      return Position.equals(this, other);
    };
    /**
     * Test if position `a` equals position `b`
     */
    Position.equals = function(a, b) {
      if (!a && !b) {
        return true;
      }
      return !!a && !!b && a.lineNumber === b.lineNumber && a.column === b.column;
    };
    /**
     * Test if this position is before other position.
     * If the two positions are equal, the result will be false.
     */
    Position.prototype.isBefore = function(other) {
      return Position.isBefore(this, other);
    };
    /**
     * Test if position `a` is before position `b`.
     * If the two positions are equal, the result will be false.
     */
    Position.isBefore = function(a, b) {
      if (a.lineNumber < b.lineNumber) {
        return true;
      }
      if (b.lineNumber < a.lineNumber) {
        return false;
      }
      return a.column < b.column;
    };
    /**
     * Test if this position is before other position.
     * If the two positions are equal, the result will be true.
     */
    Position.prototype.isBeforeOrEqual = function(other) {
      return Position.isBeforeOrEqual(this, other);
    };
    /**
     * Test if position `a` is before position `b`.
     * If the two positions are equal, the result will be true.
     */
    Position.isBeforeOrEqual = function(a, b) {
      if (a.lineNumber < b.lineNumber) {
        return true;
      }
      if (b.lineNumber < a.lineNumber) {
        return false;
      }
      return a.column <= b.column;
    };
    /**
     * A function that compares positions, useful for sorting
     */
    Position.compare = function(a, b) {
      var aLineNumber = a.lineNumber | 0;
      var bLineNumber = b.lineNumber | 0;
      if (aLineNumber === bLineNumber) {
        var aColumn = a.column | 0;
        var bColumn = b.column | 0;
        return aColumn - bColumn;
      }
      return aLineNumber - bLineNumber;
    };
    /**
     * Clone this position.
     */
    Position.prototype.clone = function() {
      return new Position(this.lineNumber, this.column);
    };
    /**
     * Convert to a human-readable representation.
     */
    Position.prototype.toString = function() {
      return '(' + this.lineNumber + ',' + this.column + ')';
    };
    // ---
    /**
     * Create a `Position` from an `IPosition`.
     */
    Position.lift = function(pos) {
      return new Position(pos.lineNumber, pos.column);
    };
    /**
     * Test if `obj` is an `IPosition`.
     */
    Position.isIPosition = function(obj) {
      return obj && typeof obj.lineNumber === 'number' && typeof obj.column === 'number';
    };
    return Position;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  /**
   * A range in the editor. (startLineNumber,startColumn) is <= (endLineNumber,endColumn)
   */
  var Range = /** @class */ (function() {
    function Range(startLineNumber, startColumn, endLineNumber, endColumn) {
      if (
        startLineNumber > endLineNumber ||
        (startLineNumber === endLineNumber && startColumn > endColumn)
      ) {
        this.startLineNumber = endLineNumber;
        this.startColumn = endColumn;
        this.endLineNumber = startLineNumber;
        this.endColumn = startColumn;
      } else {
        this.startLineNumber = startLineNumber;
        this.startColumn = startColumn;
        this.endLineNumber = endLineNumber;
        this.endColumn = endColumn;
      }
    }
    /**
     * Test if this range is empty.
     */
    Range.prototype.isEmpty = function() {
      return Range.isEmpty(this);
    };
    /**
     * Test if `range` is empty.
     */
    Range.isEmpty = function(range) {
      return range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn;
    };
    /**
     * Test if position is in this range. If the position is at the edges, will return true.
     */
    Range.prototype.containsPosition = function(position) {
      return Range.containsPosition(this, position);
    };
    /**
     * Test if `position` is in `range`. If the position is at the edges, will return true.
     */
    Range.containsPosition = function(range, position) {
      if (
        position.lineNumber < range.startLineNumber ||
        position.lineNumber > range.endLineNumber
      ) {
        return false;
      }
      if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
        return false;
      }
      if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
        return false;
      }
      return true;
    };
    /**
     * Test if range is in this range. If the range is equal to this range, will return true.
     */
    Range.prototype.containsRange = function(range) {
      return Range.containsRange(this, range);
    };
    /**
     * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
     */
    Range.containsRange = function(range, otherRange) {
      if (
        otherRange.startLineNumber < range.startLineNumber ||
        otherRange.endLineNumber < range.startLineNumber
      ) {
        return false;
      }
      if (
        otherRange.startLineNumber > range.endLineNumber ||
        otherRange.endLineNumber > range.endLineNumber
      ) {
        return false;
      }
      if (
        otherRange.startLineNumber === range.startLineNumber &&
        otherRange.startColumn < range.startColumn
      ) {
        return false;
      }
      if (
        otherRange.endLineNumber === range.endLineNumber &&
        otherRange.endColumn > range.endColumn
      ) {
        return false;
      }
      return true;
    };
    /**
     * A reunion of the two ranges.
     * The smallest position will be used as the start point, and the largest one as the end point.
     */
    Range.prototype.plusRange = function(range) {
      return Range.plusRange(this, range);
    };
    /**
     * A reunion of the two ranges.
     * The smallest position will be used as the start point, and the largest one as the end point.
     */
    Range.plusRange = function(a, b) {
      var startLineNumber;
      var startColumn;
      var endLineNumber;
      var endColumn;
      if (b.startLineNumber < a.startLineNumber) {
        startLineNumber = b.startLineNumber;
        startColumn = b.startColumn;
      } else if (b.startLineNumber === a.startLineNumber) {
        startLineNumber = b.startLineNumber;
        startColumn = Math.min(b.startColumn, a.startColumn);
      } else {
        startLineNumber = a.startLineNumber;
        startColumn = a.startColumn;
      }
      if (b.endLineNumber > a.endLineNumber) {
        endLineNumber = b.endLineNumber;
        endColumn = b.endColumn;
      } else if (b.endLineNumber === a.endLineNumber) {
        endLineNumber = b.endLineNumber;
        endColumn = Math.max(b.endColumn, a.endColumn);
      } else {
        endLineNumber = a.endLineNumber;
        endColumn = a.endColumn;
      }
      return new Range(startLineNumber, startColumn, endLineNumber, endColumn);
    };
    /**
     * A intersection of the two ranges.
     */
    Range.prototype.intersectRanges = function(range) {
      return Range.intersectRanges(this, range);
    };
    /**
     * A intersection of the two ranges.
     */
    Range.intersectRanges = function(a, b) {
      var resultStartLineNumber = a.startLineNumber;
      var resultStartColumn = a.startColumn;
      var resultEndLineNumber = a.endLineNumber;
      var resultEndColumn = a.endColumn;
      var otherStartLineNumber = b.startLineNumber;
      var otherStartColumn = b.startColumn;
      var otherEndLineNumber = b.endLineNumber;
      var otherEndColumn = b.endColumn;
      if (resultStartLineNumber < otherStartLineNumber) {
        resultStartLineNumber = otherStartLineNumber;
        resultStartColumn = otherStartColumn;
      } else if (resultStartLineNumber === otherStartLineNumber) {
        resultStartColumn = Math.max(resultStartColumn, otherStartColumn);
      }
      if (resultEndLineNumber > otherEndLineNumber) {
        resultEndLineNumber = otherEndLineNumber;
        resultEndColumn = otherEndColumn;
      } else if (resultEndLineNumber === otherEndLineNumber) {
        resultEndColumn = Math.min(resultEndColumn, otherEndColumn);
      }
      // Check if selection is now empty
      if (resultStartLineNumber > resultEndLineNumber) {
        return null;
      }
      if (resultStartLineNumber === resultEndLineNumber && resultStartColumn > resultEndColumn) {
        return null;
      }
      return new Range(
        resultStartLineNumber,
        resultStartColumn,
        resultEndLineNumber,
        resultEndColumn
      );
    };
    /**
     * Test if this range equals other.
     */
    Range.prototype.equalsRange = function(other) {
      return Range.equalsRange(this, other);
    };
    /**
     * Test if range `a` equals `b`.
     */
    Range.equalsRange = function(a, b) {
      return (
        !!a &&
        !!b &&
        a.startLineNumber === b.startLineNumber &&
        a.startColumn === b.startColumn &&
        a.endLineNumber === b.endLineNumber &&
        a.endColumn === b.endColumn
      );
    };
    /**
     * Return the end position (which will be after or equal to the start position)
     */
    Range.prototype.getEndPosition = function() {
      return new Position(this.endLineNumber, this.endColumn);
    };
    /**
     * Return the start position (which will be before or equal to the end position)
     */
    Range.prototype.getStartPosition = function() {
      return new Position(this.startLineNumber, this.startColumn);
    };
    /**
     * Transform to a user presentable string representation.
     */
    Range.prototype.toString = function() {
      return (
        '[' +
        this.startLineNumber +
        ',' +
        this.startColumn +
        ' -> ' +
        this.endLineNumber +
        ',' +
        this.endColumn +
        ']'
      );
    };
    /**
     * Create a new range using this range's start position, and using endLineNumber and endColumn as the end position.
     */
    Range.prototype.setEndPosition = function(endLineNumber, endColumn) {
      return new Range(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
    };
    /**
     * Create a new range using this range's end position, and using startLineNumber and startColumn as the start position.
     */
    Range.prototype.setStartPosition = function(startLineNumber, startColumn) {
      return new Range(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
    };
    /**
     * Create a new empty range using this range's start position.
     */
    Range.prototype.collapseToStart = function() {
      return Range.collapseToStart(this);
    };
    /**
     * Create a new empty range using this range's start position.
     */
    Range.collapseToStart = function(range) {
      return new Range(
        range.startLineNumber,
        range.startColumn,
        range.startLineNumber,
        range.startColumn
      );
    };
    // ---
    Range.fromPositions = function(start, end) {
      if (end === void 0) {
        end = start;
      }
      return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
    };
    Range.lift = function(range) {
      if (!range) {
        return null;
      }
      return new Range(
        range.startLineNumber,
        range.startColumn,
        range.endLineNumber,
        range.endColumn
      );
    };
    /**
     * Test if `obj` is an `IRange`.
     */
    Range.isIRange = function(obj) {
      return (
        obj &&
        typeof obj.startLineNumber === 'number' &&
        typeof obj.startColumn === 'number' &&
        typeof obj.endLineNumber === 'number' &&
        typeof obj.endColumn === 'number'
      );
    };
    /**
     * Test if the two ranges are touching in any way.
     */
    Range.areIntersectingOrTouching = function(a, b) {
      // Check if `a` is before `b`
      if (
        a.endLineNumber < b.startLineNumber ||
        (a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn)
      ) {
        return false;
      }
      // Check if `b` is before `a`
      if (
        b.endLineNumber < a.startLineNumber ||
        (b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn)
      ) {
        return false;
      }
      // These ranges must intersect
      return true;
    };
    /**
     * Test if the two ranges are intersecting. If the ranges are touching it returns true.
     */
    Range.areIntersecting = function(a, b) {
      // Check if `a` is before `b`
      if (
        a.endLineNumber < b.startLineNumber ||
        (a.endLineNumber === b.startLineNumber && a.endColumn <= b.startColumn)
      ) {
        return false;
      }
      // Check if `b` is before `a`
      if (
        b.endLineNumber < a.startLineNumber ||
        (b.endLineNumber === a.startLineNumber && b.endColumn <= a.startColumn)
      ) {
        return false;
      }
      // These ranges must intersect
      return true;
    };
    /**
     * A function that compares ranges, useful for sorting ranges
     * It will first compare ranges on the startPosition and then on the endPosition
     */
    Range.compareRangesUsingStarts = function(a, b) {
      if (a && b) {
        var aStartLineNumber = a.startLineNumber | 0;
        var bStartLineNumber = b.startLineNumber | 0;
        if (aStartLineNumber === bStartLineNumber) {
          var aStartColumn = a.startColumn | 0;
          var bStartColumn = b.startColumn | 0;
          if (aStartColumn === bStartColumn) {
            var aEndLineNumber = a.endLineNumber | 0;
            var bEndLineNumber = b.endLineNumber | 0;
            if (aEndLineNumber === bEndLineNumber) {
              var aEndColumn = a.endColumn | 0;
              var bEndColumn = b.endColumn | 0;
              return aEndColumn - bEndColumn;
            }
            return aEndLineNumber - bEndLineNumber;
          }
          return aStartColumn - bStartColumn;
        }
        return aStartLineNumber - bStartLineNumber;
      }
      var aExists = a ? 1 : 0;
      var bExists = b ? 1 : 0;
      return aExists - bExists;
    };
    /**
     * A function that compares ranges, useful for sorting ranges
     * It will first compare ranges on the endPosition and then on the startPosition
     */
    Range.compareRangesUsingEnds = function(a, b) {
      if (a.endLineNumber === b.endLineNumber) {
        if (a.endColumn === b.endColumn) {
          if (a.startLineNumber === b.startLineNumber) {
            return a.startColumn - b.startColumn;
          }
          return a.startLineNumber - b.startLineNumber;
        }
        return a.endColumn - b.endColumn;
      }
      return a.endLineNumber - b.endLineNumber;
    };
    /**
     * Test if the range spans multiple lines.
     */
    Range.spansMultipleLines = function(range) {
      return range.endLineNumber > range.startLineNumber;
    };
    return Range;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  /**
   * Returns first index of the string that is not whitespace.
   * If string is empty or contains only whitespaces, returns -1
   */
  function firstNonWhitespaceIndex(str) {
    for (var i = 0, len = str.length; i < len; i++) {
      var chCode = str.charCodeAt(i);
      if (chCode !== 32 /* Space */ && chCode !== 9 /* Tab */) {
        return i;
      }
    }
    return -1;
  }
  /**
   * Returns last index of the string that is not whitespace.
   * If string is empty or contains only whitespaces, returns -1
   */
  function lastNonWhitespaceIndex(str, startIndex) {
    if (startIndex === void 0) {
      startIndex = str.length - 1;
    }
    for (var i = startIndex; i >= 0; i--) {
      var chCode = str.charCodeAt(i);
      if (chCode !== 32 /* Space */ && chCode !== 9 /* Tab */) {
        return i;
      }
    }
    return -1;
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var MAXIMUM_RUN_TIME = 5000; // 5 seconds
  var MINIMUM_MATCHING_CHARACTER_LENGTH = 3;
  function computeDiff(originalSequence, modifiedSequence, continueProcessingPredicate, pretty) {
    var diffAlgo = new LcsDiff(originalSequence, modifiedSequence, continueProcessingPredicate);
    return diffAlgo.ComputeDiff(pretty);
  }
  var LineMarkerSequence = /** @class */ (function() {
    function LineMarkerSequence(lines) {
      var startColumns = [];
      var endColumns = [];
      for (var i = 0, length_1 = lines.length; i < length_1; i++) {
        startColumns[i] = LineMarkerSequence._getFirstNonBlankColumn(lines[i], 1);
        endColumns[i] = LineMarkerSequence._getLastNonBlankColumn(lines[i], 1);
      }
      this._lines = lines;
      this._startColumns = startColumns;
      this._endColumns = endColumns;
    }
    LineMarkerSequence.prototype.getLength = function() {
      return this._lines.length;
    };
    LineMarkerSequence.prototype.getElementAtIndex = function(i) {
      return this._lines[i].substring(this._startColumns[i] - 1, this._endColumns[i] - 1);
    };
    LineMarkerSequence.prototype.getStartLineNumber = function(i) {
      return i + 1;
    };
    LineMarkerSequence.prototype.getEndLineNumber = function(i) {
      return i + 1;
    };
    LineMarkerSequence._getFirstNonBlankColumn = function(txt, defaultValue) {
      var r = firstNonWhitespaceIndex(txt);
      if (r === -1) {
        return defaultValue;
      }
      return r + 1;
    };
    LineMarkerSequence._getLastNonBlankColumn = function(txt, defaultValue) {
      var r = lastNonWhitespaceIndex(txt);
      if (r === -1) {
        return defaultValue;
      }
      return r + 2;
    };
    LineMarkerSequence.prototype.getCharSequence = function(
      shouldIgnoreTrimWhitespace,
      startIndex,
      endIndex
    ) {
      var charCodes = [];
      var lineNumbers = [];
      var columns = [];
      var len = 0;
      for (var index = startIndex; index <= endIndex; index++) {
        var lineContent = this._lines[index];
        var startColumn = shouldIgnoreTrimWhitespace ? this._startColumns[index] : 1;
        var endColumn = shouldIgnoreTrimWhitespace
          ? this._endColumns[index]
          : lineContent.length + 1;
        for (var col = startColumn; col < endColumn; col++) {
          charCodes[len] = lineContent.charCodeAt(col - 1);
          lineNumbers[len] = index + 1;
          columns[len] = col;
          len++;
        }
      }
      return new CharSequence(charCodes, lineNumbers, columns);
    };
    return LineMarkerSequence;
  })();
  var CharSequence = /** @class */ (function() {
    function CharSequence(charCodes, lineNumbers, columns) {
      this._charCodes = charCodes;
      this._lineNumbers = lineNumbers;
      this._columns = columns;
    }
    CharSequence.prototype.getLength = function() {
      return this._charCodes.length;
    };
    CharSequence.prototype.getElementAtIndex = function(i) {
      return this._charCodes[i];
    };
    CharSequence.prototype.getStartLineNumber = function(i) {
      return this._lineNumbers[i];
    };
    CharSequence.prototype.getStartColumn = function(i) {
      return this._columns[i];
    };
    CharSequence.prototype.getEndLineNumber = function(i) {
      return this._lineNumbers[i];
    };
    CharSequence.prototype.getEndColumn = function(i) {
      return this._columns[i] + 1;
    };
    return CharSequence;
  })();
  var CharChange = /** @class */ (function() {
    function CharChange(
      originalStartLineNumber,
      originalStartColumn,
      originalEndLineNumber,
      originalEndColumn,
      modifiedStartLineNumber,
      modifiedStartColumn,
      modifiedEndLineNumber,
      modifiedEndColumn
    ) {
      this.originalStartLineNumber = originalStartLineNumber;
      this.originalStartColumn = originalStartColumn;
      this.originalEndLineNumber = originalEndLineNumber;
      this.originalEndColumn = originalEndColumn;
      this.modifiedStartLineNumber = modifiedStartLineNumber;
      this.modifiedStartColumn = modifiedStartColumn;
      this.modifiedEndLineNumber = modifiedEndLineNumber;
      this.modifiedEndColumn = modifiedEndColumn;
    }
    CharChange.createFromDiffChange = function(
      diffChange,
      originalCharSequence,
      modifiedCharSequence
    ) {
      var originalStartLineNumber;
      var originalStartColumn;
      var originalEndLineNumber;
      var originalEndColumn;
      var modifiedStartLineNumber;
      var modifiedStartColumn;
      var modifiedEndLineNumber;
      var modifiedEndColumn;
      if (diffChange.originalLength === 0) {
        originalStartLineNumber = 0;
        originalStartColumn = 0;
        originalEndLineNumber = 0;
        originalEndColumn = 0;
      } else {
        originalStartLineNumber = originalCharSequence.getStartLineNumber(diffChange.originalStart);
        originalStartColumn = originalCharSequence.getStartColumn(diffChange.originalStart);
        originalEndLineNumber = originalCharSequence.getEndLineNumber(
          diffChange.originalStart + diffChange.originalLength - 1
        );
        originalEndColumn = originalCharSequence.getEndColumn(
          diffChange.originalStart + diffChange.originalLength - 1
        );
      }
      if (diffChange.modifiedLength === 0) {
        modifiedStartLineNumber = 0;
        modifiedStartColumn = 0;
        modifiedEndLineNumber = 0;
        modifiedEndColumn = 0;
      } else {
        modifiedStartLineNumber = modifiedCharSequence.getStartLineNumber(diffChange.modifiedStart);
        modifiedStartColumn = modifiedCharSequence.getStartColumn(diffChange.modifiedStart);
        modifiedEndLineNumber = modifiedCharSequence.getEndLineNumber(
          diffChange.modifiedStart + diffChange.modifiedLength - 1
        );
        modifiedEndColumn = modifiedCharSequence.getEndColumn(
          diffChange.modifiedStart + diffChange.modifiedLength - 1
        );
      }
      return new CharChange(
        originalStartLineNumber,
        originalStartColumn,
        originalEndLineNumber,
        originalEndColumn,
        modifiedStartLineNumber,
        modifiedStartColumn,
        modifiedEndLineNumber,
        modifiedEndColumn
      );
    };
    return CharChange;
  })();
  function postProcessCharChanges(rawChanges) {
    if (rawChanges.length <= 1) {
      return rawChanges;
    }
    var result = [rawChanges[0]];
    var prevChange = result[0];
    for (var i = 1, len = rawChanges.length; i < len; i++) {
      var currChange = rawChanges[i];
      var originalMatchingLength =
        currChange.originalStart - (prevChange.originalStart + prevChange.originalLength);
      var modifiedMatchingLength =
        currChange.modifiedStart - (prevChange.modifiedStart + prevChange.modifiedLength);
      // Both of the above should be equal, but the continueProcessingPredicate may prevent this from being true
      var matchingLength = Math.min(originalMatchingLength, modifiedMatchingLength);
      if (matchingLength < MINIMUM_MATCHING_CHARACTER_LENGTH) {
        // Merge the current change into the previous one
        prevChange.originalLength =
          currChange.originalStart + currChange.originalLength - prevChange.originalStart;
        prevChange.modifiedLength =
          currChange.modifiedStart + currChange.modifiedLength - prevChange.modifiedStart;
      } else {
        // Add the current change
        result.push(currChange);
        prevChange = currChange;
      }
    }
    return result;
  }
  var LineChange = /** @class */ (function() {
    function LineChange(
      originalStartLineNumber,
      originalEndLineNumber,
      modifiedStartLineNumber,
      modifiedEndLineNumber,
      charChanges
    ) {
      this.originalStartLineNumber = originalStartLineNumber;
      this.originalEndLineNumber = originalEndLineNumber;
      this.modifiedStartLineNumber = modifiedStartLineNumber;
      this.modifiedEndLineNumber = modifiedEndLineNumber;
      this.charChanges = charChanges;
    }
    LineChange.createFromDiffResult = function(
      shouldIgnoreTrimWhitespace,
      diffChange,
      originalLineSequence,
      modifiedLineSequence,
      continueProcessingPredicate,
      shouldComputeCharChanges,
      shouldPostProcessCharChanges
    ) {
      var originalStartLineNumber;
      var originalEndLineNumber;
      var modifiedStartLineNumber;
      var modifiedEndLineNumber;
      var charChanges = undefined;
      if (diffChange.originalLength === 0) {
        originalStartLineNumber =
          originalLineSequence.getStartLineNumber(diffChange.originalStart) - 1;
        originalEndLineNumber = 0;
      } else {
        originalStartLineNumber = originalLineSequence.getStartLineNumber(diffChange.originalStart);
        originalEndLineNumber = originalLineSequence.getEndLineNumber(
          diffChange.originalStart + diffChange.originalLength - 1
        );
      }
      if (diffChange.modifiedLength === 0) {
        modifiedStartLineNumber =
          modifiedLineSequence.getStartLineNumber(diffChange.modifiedStart) - 1;
        modifiedEndLineNumber = 0;
      } else {
        modifiedStartLineNumber = modifiedLineSequence.getStartLineNumber(diffChange.modifiedStart);
        modifiedEndLineNumber = modifiedLineSequence.getEndLineNumber(
          diffChange.modifiedStart + diffChange.modifiedLength - 1
        );
      }
      if (
        shouldComputeCharChanges &&
        diffChange.originalLength !== 0 &&
        diffChange.modifiedLength !== 0 &&
        continueProcessingPredicate()
      ) {
        var originalCharSequence = originalLineSequence.getCharSequence(
          shouldIgnoreTrimWhitespace,
          diffChange.originalStart,
          diffChange.originalStart + diffChange.originalLength - 1
        );
        var modifiedCharSequence = modifiedLineSequence.getCharSequence(
          shouldIgnoreTrimWhitespace,
          diffChange.modifiedStart,
          diffChange.modifiedStart + diffChange.modifiedLength - 1
        );
        var rawChanges = computeDiff(
          originalCharSequence,
          modifiedCharSequence,
          continueProcessingPredicate,
          true
        );
        if (shouldPostProcessCharChanges) {
          rawChanges = postProcessCharChanges(rawChanges);
        }
        charChanges = [];
        for (var i = 0, length_2 = rawChanges.length; i < length_2; i++) {
          charChanges.push(
            CharChange.createFromDiffChange(
              rawChanges[i],
              originalCharSequence,
              modifiedCharSequence
            )
          );
        }
      }
      return new LineChange(
        originalStartLineNumber,
        originalEndLineNumber,
        modifiedStartLineNumber,
        modifiedEndLineNumber,
        charChanges
      );
    };
    return LineChange;
  })();
  var DiffComputer = /** @class */ (function() {
    function DiffComputer(originalLines, modifiedLines, opts) {
      this.shouldComputeCharChanges = opts.shouldComputeCharChanges;
      this.shouldPostProcessCharChanges = opts.shouldPostProcessCharChanges;
      this.shouldIgnoreTrimWhitespace = opts.shouldIgnoreTrimWhitespace;
      this.shouldMakePrettyDiff = opts.shouldMakePrettyDiff;
      this.maximumRunTimeMs = MAXIMUM_RUN_TIME;
      this.originalLines = originalLines;
      this.modifiedLines = modifiedLines;
      this.original = new LineMarkerSequence(originalLines);
      this.modified = new LineMarkerSequence(modifiedLines);
    }
    DiffComputer.prototype.computeDiff = function() {
      if (this.original.getLength() === 1 && this.original.getElementAtIndex(0).length === 0) {
        // empty original => fast path
        return [
          {
            originalStartLineNumber: 1,
            originalEndLineNumber: 1,
            modifiedStartLineNumber: 1,
            modifiedEndLineNumber: this.modified.getLength(),
            charChanges: [
              {
                modifiedEndColumn: 0,
                modifiedEndLineNumber: 0,
                modifiedStartColumn: 0,
                modifiedStartLineNumber: 0,
                originalEndColumn: 0,
                originalEndLineNumber: 0,
                originalStartColumn: 0,
                originalStartLineNumber: 0,
              },
            ],
          },
        ];
      }
      if (this.modified.getLength() === 1 && this.modified.getElementAtIndex(0).length === 0) {
        // empty modified => fast path
        return [
          {
            originalStartLineNumber: 1,
            originalEndLineNumber: this.original.getLength(),
            modifiedStartLineNumber: 1,
            modifiedEndLineNumber: 1,
            charChanges: [
              {
                modifiedEndColumn: 0,
                modifiedEndLineNumber: 0,
                modifiedStartColumn: 0,
                modifiedStartLineNumber: 0,
                originalEndColumn: 0,
                originalEndLineNumber: 0,
                originalStartColumn: 0,
                originalStartLineNumber: 0,
              },
            ],
          },
        ];
      }
      this.computationStartTime = new Date().getTime();
      var rawChanges = computeDiff(
        this.original,
        this.modified,
        this._continueProcessingPredicate.bind(this),
        this.shouldMakePrettyDiff
      );
      // The diff is always computed with ignoring trim whitespace
      // This ensures we get the prettiest diff
      if (this.shouldIgnoreTrimWhitespace) {
        var lineChanges = [];
        for (var i = 0, length_3 = rawChanges.length; i < length_3; i++) {
          lineChanges.push(
            LineChange.createFromDiffResult(
              this.shouldIgnoreTrimWhitespace,
              rawChanges[i],
              this.original,
              this.modified,
              this._continueProcessingPredicate.bind(this),
              this.shouldComputeCharChanges,
              this.shouldPostProcessCharChanges
            )
          );
        }
        return lineChanges;
      }
      // Need to post-process and introduce changes where the trim whitespace is different
      // Note that we are looping starting at -1 to also cover the lines before the first change
      var result = [];
      var originalLineIndex = 0;
      var modifiedLineIndex = 0;
      for (var i = -1 /* !!!! */, len = rawChanges.length; i < len; i++) {
        var nextChange = i + 1 < len ? rawChanges[i + 1] : null;
        var originalStop = nextChange ? nextChange.originalStart : this.originalLines.length;
        var modifiedStop = nextChange ? nextChange.modifiedStart : this.modifiedLines.length;
        while (originalLineIndex < originalStop && modifiedLineIndex < modifiedStop) {
          var originalLine = this.originalLines[originalLineIndex];
          var modifiedLine = this.modifiedLines[modifiedLineIndex];
          if (originalLine !== modifiedLine) {
            // These lines differ only in trim whitespace
            // Check the leading whitespace
            {
              var originalStartColumn = LineMarkerSequence._getFirstNonBlankColumn(originalLine, 1);
              var modifiedStartColumn = LineMarkerSequence._getFirstNonBlankColumn(modifiedLine, 1);
              while (originalStartColumn > 1 && modifiedStartColumn > 1) {
                var originalChar = originalLine.charCodeAt(originalStartColumn - 2);
                var modifiedChar = modifiedLine.charCodeAt(modifiedStartColumn - 2);
                if (originalChar !== modifiedChar) {
                  break;
                }
                originalStartColumn--;
                modifiedStartColumn--;
              }
              if (originalStartColumn > 1 || modifiedStartColumn > 1) {
                this._pushTrimWhitespaceCharChange(
                  result,
                  originalLineIndex + 1,
                  1,
                  originalStartColumn,
                  modifiedLineIndex + 1,
                  1,
                  modifiedStartColumn
                );
              }
            }
            // Check the trailing whitespace
            {
              var originalEndColumn = LineMarkerSequence._getLastNonBlankColumn(originalLine, 1);
              var modifiedEndColumn = LineMarkerSequence._getLastNonBlankColumn(modifiedLine, 1);
              var originalMaxColumn = originalLine.length + 1;
              var modifiedMaxColumn = modifiedLine.length + 1;
              while (
                originalEndColumn < originalMaxColumn &&
                modifiedEndColumn < modifiedMaxColumn
              ) {
                var originalChar = originalLine.charCodeAt(originalEndColumn - 1);
                var modifiedChar = originalLine.charCodeAt(modifiedEndColumn - 1);
                if (originalChar !== modifiedChar) {
                  break;
                }
                originalEndColumn++;
                modifiedEndColumn++;
              }
              if (originalEndColumn < originalMaxColumn || modifiedEndColumn < modifiedMaxColumn) {
                this._pushTrimWhitespaceCharChange(
                  result,
                  originalLineIndex + 1,
                  originalEndColumn,
                  originalMaxColumn,
                  modifiedLineIndex + 1,
                  modifiedEndColumn,
                  modifiedMaxColumn
                );
              }
            }
          }
          originalLineIndex++;
          modifiedLineIndex++;
        }
        if (nextChange) {
          // Emit the actual change
          result.push(
            LineChange.createFromDiffResult(
              this.shouldIgnoreTrimWhitespace,
              nextChange,
              this.original,
              this.modified,
              this._continueProcessingPredicate.bind(this),
              this.shouldComputeCharChanges,
              this.shouldPostProcessCharChanges
            )
          );
          originalLineIndex += nextChange.originalLength;
          modifiedLineIndex += nextChange.modifiedLength;
        }
      }
      return result;
    };
    DiffComputer.prototype._pushTrimWhitespaceCharChange = function(
      result,
      originalLineNumber,
      originalStartColumn,
      originalEndColumn,
      modifiedLineNumber,
      modifiedStartColumn,
      modifiedEndColumn
    ) {
      if (
        this._mergeTrimWhitespaceCharChange(
          result,
          originalLineNumber,
          originalStartColumn,
          originalEndColumn,
          modifiedLineNumber,
          modifiedStartColumn,
          modifiedEndColumn
        )
      ) {
        // Merged into previous
        return;
      }
      var charChanges = undefined;
      if (this.shouldComputeCharChanges) {
        charChanges = [
          new CharChange(
            originalLineNumber,
            originalStartColumn,
            originalLineNumber,
            originalEndColumn,
            modifiedLineNumber,
            modifiedStartColumn,
            modifiedLineNumber,
            modifiedEndColumn
          ),
        ];
      }
      result.push(
        new LineChange(
          originalLineNumber,
          originalLineNumber,
          modifiedLineNumber,
          modifiedLineNumber,
          charChanges
        )
      );
    };
    DiffComputer.prototype._mergeTrimWhitespaceCharChange = function(
      result,
      originalLineNumber,
      originalStartColumn,
      originalEndColumn,
      modifiedLineNumber,
      modifiedStartColumn,
      modifiedEndColumn
    ) {
      var len = result.length;
      if (len === 0) {
        return false;
      }
      var prevChange = result[len - 1];
      if (prevChange.originalEndLineNumber === 0 || prevChange.modifiedEndLineNumber === 0) {
        // Don't merge with inserts/deletes
        return false;
      }
      if (
        prevChange.originalEndLineNumber + 1 === originalLineNumber &&
        prevChange.modifiedEndLineNumber + 1 === modifiedLineNumber
      ) {
        prevChange.originalEndLineNumber = originalLineNumber;
        prevChange.modifiedEndLineNumber = modifiedLineNumber;
        if (this.shouldComputeCharChanges) {
          prevChange.charChanges.push(
            new CharChange(
              originalLineNumber,
              originalStartColumn,
              originalLineNumber,
              originalEndColumn,
              modifiedLineNumber,
              modifiedStartColumn,
              modifiedLineNumber,
              modifiedEndColumn
            )
          );
        }
        return true;
      }
      return false;
    };
    DiffComputer.prototype._continueProcessingPredicate = function() {
      if (this.maximumRunTimeMs === 0) {
        return true;
      }
      var now = new Date().getTime();
      return now - this.computationStartTime < this.maximumRunTimeMs;
    };
    return DiffComputer;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var Uint8Matrix = /** @class */ (function() {
    function Uint8Matrix(rows, cols, defaultValue) {
      var data = new Uint8Array(rows * cols);
      for (var i = 0, len = rows * cols; i < len; i++) {
        data[i] = defaultValue;
      }
      this._data = data;
      this.rows = rows;
      this.cols = cols;
    }
    Uint8Matrix.prototype.get = function(row, col) {
      return this._data[row * this.cols + col];
    };
    Uint8Matrix.prototype.set = function(row, col, value) {
      this._data[row * this.cols + col] = value;
    };
    return Uint8Matrix;
  })();
  function toUint8(v) {
    if (v < 0) {
      return 0;
    }
    if (v > 255 /* MAX_UINT_8 */) {
      return 255 /* MAX_UINT_8 */;
    }
    return v | 0;
  }
  function toUint32(v) {
    if (v < 0) {
      return 0;
    }
    if (v > 4294967295 /* MAX_UINT_32 */) {
      return 4294967295 /* MAX_UINT_32 */;
    }
    return v | 0;
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var PrefixSumIndexOfResult = /** @class */ (function() {
    function PrefixSumIndexOfResult(index, remainder) {
      this.index = index;
      this.remainder = remainder;
    }
    return PrefixSumIndexOfResult;
  })();
  var PrefixSumComputer = /** @class */ (function() {
    function PrefixSumComputer(values) {
      this.values = values;
      this.prefixSum = new Uint32Array(values.length);
      this.prefixSumValidIndex = new Int32Array(1);
      this.prefixSumValidIndex[0] = -1;
    }
    PrefixSumComputer.prototype.getCount = function() {
      return this.values.length;
    };
    PrefixSumComputer.prototype.insertValues = function(insertIndex, insertValues) {
      insertIndex = toUint32(insertIndex);
      var oldValues = this.values;
      var oldPrefixSum = this.prefixSum;
      var insertValuesLen = insertValues.length;
      if (insertValuesLen === 0) {
        return false;
      }
      this.values = new Uint32Array(oldValues.length + insertValuesLen);
      this.values.set(oldValues.subarray(0, insertIndex), 0);
      this.values.set(oldValues.subarray(insertIndex), insertIndex + insertValuesLen);
      this.values.set(insertValues, insertIndex);
      if (insertIndex - 1 < this.prefixSumValidIndex[0]) {
        this.prefixSumValidIndex[0] = insertIndex - 1;
      }
      this.prefixSum = new Uint32Array(this.values.length);
      if (this.prefixSumValidIndex[0] >= 0) {
        this.prefixSum.set(oldPrefixSum.subarray(0, this.prefixSumValidIndex[0] + 1));
      }
      return true;
    };
    PrefixSumComputer.prototype.changeValue = function(index, value) {
      index = toUint32(index);
      value = toUint32(value);
      if (this.values[index] === value) {
        return false;
      }
      this.values[index] = value;
      if (index - 1 < this.prefixSumValidIndex[0]) {
        this.prefixSumValidIndex[0] = index - 1;
      }
      return true;
    };
    PrefixSumComputer.prototype.removeValues = function(startIndex, cnt) {
      startIndex = toUint32(startIndex);
      cnt = toUint32(cnt);
      var oldValues = this.values;
      var oldPrefixSum = this.prefixSum;
      if (startIndex >= oldValues.length) {
        return false;
      }
      var maxCnt = oldValues.length - startIndex;
      if (cnt >= maxCnt) {
        cnt = maxCnt;
      }
      if (cnt === 0) {
        return false;
      }
      this.values = new Uint32Array(oldValues.length - cnt);
      this.values.set(oldValues.subarray(0, startIndex), 0);
      this.values.set(oldValues.subarray(startIndex + cnt), startIndex);
      this.prefixSum = new Uint32Array(this.values.length);
      if (startIndex - 1 < this.prefixSumValidIndex[0]) {
        this.prefixSumValidIndex[0] = startIndex - 1;
      }
      if (this.prefixSumValidIndex[0] >= 0) {
        this.prefixSum.set(oldPrefixSum.subarray(0, this.prefixSumValidIndex[0] + 1));
      }
      return true;
    };
    PrefixSumComputer.prototype.getTotalValue = function() {
      if (this.values.length === 0) {
        return 0;
      }
      return this._getAccumulatedValue(this.values.length - 1);
    };
    PrefixSumComputer.prototype.getAccumulatedValue = function(index) {
      if (index < 0) {
        return 0;
      }
      index = toUint32(index);
      return this._getAccumulatedValue(index);
    };
    PrefixSumComputer.prototype._getAccumulatedValue = function(index) {
      if (index <= this.prefixSumValidIndex[0]) {
        return this.prefixSum[index];
      }
      var startIndex = this.prefixSumValidIndex[0] + 1;
      if (startIndex === 0) {
        this.prefixSum[0] = this.values[0];
        startIndex++;
      }
      if (index >= this.values.length) {
        index = this.values.length - 1;
      }
      for (var i = startIndex; i <= index; i++) {
        this.prefixSum[i] = this.prefixSum[i - 1] + this.values[i];
      }
      this.prefixSumValidIndex[0] = Math.max(this.prefixSumValidIndex[0], index);
      return this.prefixSum[index];
    };
    PrefixSumComputer.prototype.getIndexOf = function(accumulatedValue) {
      accumulatedValue = Math.floor(accumulatedValue); //@perf
      // Compute all sums (to get a fully valid prefixSum)
      this.getTotalValue();
      var low = 0;
      var high = this.values.length - 1;
      var mid = 0;
      var midStop = 0;
      var midStart = 0;
      while (low <= high) {
        mid = (low + (high - low) / 2) | 0;
        midStop = this.prefixSum[mid];
        midStart = midStop - this.values[mid];
        if (accumulatedValue < midStart) {
          high = mid - 1;
        } else if (accumulatedValue >= midStop) {
          low = mid + 1;
        } else {
          break;
        }
      }
      return new PrefixSumIndexOfResult(mid, accumulatedValue - midStart);
    };
    return PrefixSumComputer;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var MirrorTextModel = /** @class */ (function() {
    function MirrorTextModel(uri, lines, eol, versionId) {
      this._uri = uri;
      this._lines = lines;
      this._eol = eol;
      this._versionId = versionId;
      this._lineStarts = null;
    }
    MirrorTextModel.prototype.dispose = function() {
      this._lines.length = 0;
    };
    MirrorTextModel.prototype.getText = function() {
      return this._lines.join(this._eol);
    };
    MirrorTextModel.prototype.onEvents = function(e) {
      if (e.eol && e.eol !== this._eol) {
        this._eol = e.eol;
        this._lineStarts = null;
      }
      // Update my lines
      var changes = e.changes;
      for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
        var change = changes_1[_i];
        this._acceptDeleteRange(change.range);
        this._acceptInsertText(
          new Position(change.range.startLineNumber, change.range.startColumn),
          change.text
        );
      }
      this._versionId = e.versionId;
    };
    MirrorTextModel.prototype._ensureLineStarts = function() {
      if (!this._lineStarts) {
        var eolLength = this._eol.length;
        var linesLength = this._lines.length;
        var lineStartValues = new Uint32Array(linesLength);
        for (var i = 0; i < linesLength; i++) {
          lineStartValues[i] = this._lines[i].length + eolLength;
        }
        this._lineStarts = new PrefixSumComputer(lineStartValues);
      }
    };
    /**
     * All changes to a line's text go through this method
     */
    MirrorTextModel.prototype._setLineText = function(lineIndex, newValue) {
      this._lines[lineIndex] = newValue;
      if (this._lineStarts) {
        // update prefix sum
        this._lineStarts.changeValue(lineIndex, this._lines[lineIndex].length + this._eol.length);
      }
    };
    MirrorTextModel.prototype._acceptDeleteRange = function(range) {
      if (range.startLineNumber === range.endLineNumber) {
        if (range.startColumn === range.endColumn) {
          // Nothing to delete
          return;
        }
        // Delete text on the affected line
        this._setLineText(
          range.startLineNumber - 1,
          this._lines[range.startLineNumber - 1].substring(0, range.startColumn - 1) +
            this._lines[range.startLineNumber - 1].substring(range.endColumn - 1)
        );
        return;
      }
      // Take remaining text on last line and append it to remaining text on first line
      this._setLineText(
        range.startLineNumber - 1,
        this._lines[range.startLineNumber - 1].substring(0, range.startColumn - 1) +
          this._lines[range.endLineNumber - 1].substring(range.endColumn - 1)
      );
      // Delete middle lines
      this._lines.splice(range.startLineNumber, range.endLineNumber - range.startLineNumber);
      if (this._lineStarts) {
        // update prefix sum
        this._lineStarts.removeValues(
          range.startLineNumber,
          range.endLineNumber - range.startLineNumber
        );
      }
    };
    MirrorTextModel.prototype._acceptInsertText = function(position, insertText) {
      if (insertText.length === 0) {
        // Nothing to insert
        return;
      }
      var insertLines = insertText.split(/\r\n|\r|\n/);
      if (insertLines.length === 1) {
        // Inserting text on one line
        this._setLineText(
          position.lineNumber - 1,
          this._lines[position.lineNumber - 1].substring(0, position.column - 1) +
            insertLines[0] +
            this._lines[position.lineNumber - 1].substring(position.column - 1)
        );
        return;
      }
      // Append overflowing text from first line to the end of text to insert
      insertLines[insertLines.length - 1] += this._lines[position.lineNumber - 1].substring(
        position.column - 1
      );
      // Delete overflowing text from first line and insert text on first line
      this._setLineText(
        position.lineNumber - 1,
        this._lines[position.lineNumber - 1].substring(0, position.column - 1) + insertLines[0]
      );
      // Insert new lines & store lengths
      var newLengths = new Uint32Array(insertLines.length - 1);
      for (var i = 1; i < insertLines.length; i++) {
        this._lines.splice(position.lineNumber + i - 1, 0, insertLines[i]);
        newLengths[i - 1] = insertLines[i].length + this._eol.length;
      }
      if (this._lineStarts) {
        // update prefix sum
        this._lineStarts.insertValues(position.lineNumber, newLengths);
      }
    };
    return MirrorTextModel;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var USUAL_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';
  /**
   * Create a word definition regular expression based on default word separators.
   * Optionally provide allowed separators that should be included in words.
   *
   * The default would look like this:
   * /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
   */
  function createWordRegExp(allowInWords) {
    if (allowInWords === void 0) {
      allowInWords = '';
    }
    var source = '(-?\\d*\\.\\d\\w*)|([^';
    for (
      var _i = 0, USUAL_WORD_SEPARATORS_1 = USUAL_WORD_SEPARATORS;
      _i < USUAL_WORD_SEPARATORS_1.length;
      _i++
    ) {
      var sep = USUAL_WORD_SEPARATORS_1[_i];
      if (allowInWords.indexOf(sep) >= 0) {
        continue;
      }
      source += '\\' + sep;
    }
    source += '\\s]+)';
    return new RegExp(source, 'g');
  }
  // catches numbers (including floating numbers) in the first group, and alphanum in the second
  var DEFAULT_WORD_REGEXP = createWordRegExp();
  function ensureValidWordDefinition(wordDefinition) {
    var result = DEFAULT_WORD_REGEXP;
    if (wordDefinition && wordDefinition instanceof RegExp) {
      if (!wordDefinition.global) {
        var flags = 'g';
        if (wordDefinition.ignoreCase) {
          flags += 'i';
        }
        if (wordDefinition.multiline) {
          flags += 'm';
        }
        if (wordDefinition.unicode) {
          flags += 'u';
        }
        result = new RegExp(wordDefinition.source, flags);
      } else {
        result = wordDefinition;
      }
    }
    result.lastIndex = 0;
    return result;
  }
  function getWordAtPosFast(column, wordDefinition, text, textOffset) {
    // find whitespace enclosed text around column and match from there
    var pos = column - 1 - textOffset;
    var start = text.lastIndexOf(' ', pos - 1) + 1;
    wordDefinition.lastIndex = start;
    var match;
    while ((match = wordDefinition.exec(text))) {
      var matchIndex = match.index || 0;
      if (matchIndex <= pos && wordDefinition.lastIndex >= pos) {
        return {
          word: match[0],
          startColumn: textOffset + 1 + matchIndex,
          endColumn: textOffset + 1 + wordDefinition.lastIndex,
        };
      }
    }
    return null;
  }
  function getWordAtPosSlow(column, wordDefinition, text, textOffset) {
    // matches all words starting at the beginning
    // of the input until it finds a match that encloses
    // the desired column. slow but correct
    var pos = column - 1 - textOffset;
    wordDefinition.lastIndex = 0;
    var match;
    while ((match = wordDefinition.exec(text))) {
      var matchIndex = match.index || 0;
      if (matchIndex > pos) {
        // |nW -> matched only after the pos
        return null;
      } else if (wordDefinition.lastIndex >= pos) {
        // W|W -> match encloses pos
        return {
          word: match[0],
          startColumn: textOffset + 1 + matchIndex,
          endColumn: textOffset + 1 + wordDefinition.lastIndex,
        };
      }
    }
    return null;
  }
  function getWordAtText(column, wordDefinition, text, textOffset) {
    // if `words` can contain whitespace character we have to use the slow variant
    // otherwise we use the fast variant of finding a word
    wordDefinition.lastIndex = 0;
    var match = wordDefinition.exec(text);
    if (!match) {
      return null;
    }
    // todo@joh the `match` could already be the (first) word
    var ret =
      match[0].indexOf(' ') >= 0
        ? // did match a word which contains a space character -> use slow word find
          getWordAtPosSlow(column, wordDefinition, text, textOffset)
        : // sane word definition -> use fast word find
          getWordAtPosFast(column, wordDefinition, text, textOffset);
    // both (getWordAtPosFast and getWordAtPosSlow) leave the wordDefinition-RegExp
    // in an undefined state and to not confuse other users of the wordDefinition
    // we reset the lastIndex
    wordDefinition.lastIndex = 0;
    return ret;
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  /**
   * A fast character classifier that uses a compact array for ASCII values.
   */
  var CharacterClassifier = /** @class */ (function() {
    function CharacterClassifier(_defaultValue) {
      var defaultValue = toUint8(_defaultValue);
      this._defaultValue = defaultValue;
      this._asciiMap = CharacterClassifier._createAsciiMap(defaultValue);
      this._map = new Map();
    }
    CharacterClassifier._createAsciiMap = function(defaultValue) {
      var asciiMap = new Uint8Array(256);
      for (var i = 0; i < 256; i++) {
        asciiMap[i] = defaultValue;
      }
      return asciiMap;
    };
    CharacterClassifier.prototype.set = function(charCode, _value) {
      var value = toUint8(_value);
      if (charCode >= 0 && charCode < 256) {
        this._asciiMap[charCode] = value;
      } else {
        this._map.set(charCode, value);
      }
    };
    CharacterClassifier.prototype.get = function(charCode) {
      if (charCode >= 0 && charCode < 256) {
        return this._asciiMap[charCode];
      } else {
        return this._map.get(charCode) || this._defaultValue;
      }
    };
    return CharacterClassifier;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var StateMachine = /** @class */ (function() {
    function StateMachine(edges) {
      var maxCharCode = 0;
      var maxState = 0; /* Invalid */
      for (var i = 0, len = edges.length; i < len; i++) {
        var _a = edges[i],
          from = _a[0],
          chCode = _a[1],
          to = _a[2];
        if (chCode > maxCharCode) {
          maxCharCode = chCode;
        }
        if (from > maxState) {
          maxState = from;
        }
        if (to > maxState) {
          maxState = to;
        }
      }
      maxCharCode++;
      maxState++;
      var states = new Uint8Matrix(maxState, maxCharCode, 0 /* Invalid */);
      for (var i = 0, len = edges.length; i < len; i++) {
        var _b = edges[i],
          from = _b[0],
          chCode = _b[1],
          to = _b[2];
        states.set(from, chCode, to);
      }
      this._states = states;
      this._maxCharCode = maxCharCode;
    }
    StateMachine.prototype.nextState = function(currentState, chCode) {
      if (chCode < 0 || chCode >= this._maxCharCode) {
        return 0 /* Invalid */;
      }
      return this._states.get(currentState, chCode);
    };
    return StateMachine;
  })();
  // State machine for http:// or https:// or file://
  var _stateMachine = null;
  function getStateMachine() {
    if (_stateMachine === null) {
      _stateMachine = new StateMachine([
        [1 /* Start */, 104 /* h */, 2 /* H */],
        [1 /* Start */, 72 /* H */, 2 /* H */],
        [1 /* Start */, 102 /* f */, 6 /* F */],
        [1 /* Start */, 70 /* F */, 6 /* F */],
        [2 /* H */, 116 /* t */, 3 /* HT */],
        [2 /* H */, 84 /* T */, 3 /* HT */],
        [3 /* HT */, 116 /* t */, 4 /* HTT */],
        [3 /* HT */, 84 /* T */, 4 /* HTT */],
        [4 /* HTT */, 112 /* p */, 5 /* HTTP */],
        [4 /* HTT */, 80 /* P */, 5 /* HTTP */],
        [5 /* HTTP */, 115 /* s */, 9 /* BeforeColon */],
        [5 /* HTTP */, 83 /* S */, 9 /* BeforeColon */],
        [5 /* HTTP */, 58 /* Colon */, 10 /* AfterColon */],
        [6 /* F */, 105 /* i */, 7 /* FI */],
        [6 /* F */, 73 /* I */, 7 /* FI */],
        [7 /* FI */, 108 /* l */, 8 /* FIL */],
        [7 /* FI */, 76 /* L */, 8 /* FIL */],
        [8 /* FIL */, 101 /* e */, 9 /* BeforeColon */],
        [8 /* FIL */, 69 /* E */, 9 /* BeforeColon */],
        [9 /* BeforeColon */, 58 /* Colon */, 10 /* AfterColon */],
        [10 /* AfterColon */, 47 /* Slash */, 11 /* AlmostThere */],
        [11 /* AlmostThere */, 47 /* Slash */, 12 /* End */],
      ]);
    }
    return _stateMachine;
  }
  var _classifier = null;
  function getClassifier() {
    if (_classifier === null) {
      _classifier = new CharacterClassifier(0 /* None */);
      var FORCE_TERMINATION_CHARACTERS =
        ' \t<>\'"、。｡､，．：；？！＠＃＄％＆＊‘“〈《「『【〔（［｛｢｣｝］）〕】』」》〉”’｀～…';
      for (var i = 0; i < FORCE_TERMINATION_CHARACTERS.length; i++) {
        _classifier.set(FORCE_TERMINATION_CHARACTERS.charCodeAt(i), 1 /* ForceTermination */);
      }
      var CANNOT_END_WITH_CHARACTERS = '.,;';
      for (var i = 0; i < CANNOT_END_WITH_CHARACTERS.length; i++) {
        _classifier.set(CANNOT_END_WITH_CHARACTERS.charCodeAt(i), 2 /* CannotEndIn */);
      }
    }
    return _classifier;
  }
  var LinkComputer = /** @class */ (function() {
    function LinkComputer() {}
    LinkComputer._createLink = function(
      classifier,
      line,
      lineNumber,
      linkBeginIndex,
      linkEndIndex
    ) {
      // Do not allow to end link in certain characters...
      var lastIncludedCharIndex = linkEndIndex - 1;
      do {
        var chCode = line.charCodeAt(lastIncludedCharIndex);
        var chClass = classifier.get(chCode);
        if (chClass !== 2 /* CannotEndIn */) {
          break;
        }
        lastIncludedCharIndex--;
      } while (lastIncludedCharIndex > linkBeginIndex);
      // Handle links enclosed in parens, square brackets and curlys.
      if (linkBeginIndex > 0) {
        var charCodeBeforeLink = line.charCodeAt(linkBeginIndex - 1);
        var lastCharCodeInLink = line.charCodeAt(lastIncludedCharIndex);
        if (
          (charCodeBeforeLink === 40 /* OpenParen */ &&
            lastCharCodeInLink === 41) /* CloseParen */ ||
          (charCodeBeforeLink === 91 /* OpenSquareBracket */ &&
            lastCharCodeInLink === 93) /* CloseSquareBracket */ ||
          (charCodeBeforeLink === 123 /* OpenCurlyBrace */ &&
            lastCharCodeInLink === 125) /* CloseCurlyBrace */
        ) {
          // Do not end in ) if ( is before the link start
          // Do not end in ] if [ is before the link start
          // Do not end in } if { is before the link start
          lastIncludedCharIndex--;
        }
      }
      return {
        range: {
          startLineNumber: lineNumber,
          startColumn: linkBeginIndex + 1,
          endLineNumber: lineNumber,
          endColumn: lastIncludedCharIndex + 2,
        },
        url: line.substring(linkBeginIndex, lastIncludedCharIndex + 1),
      };
    };
    LinkComputer.computeLinks = function(model, stateMachine) {
      if (stateMachine === void 0) {
        stateMachine = getStateMachine();
      }
      var classifier = getClassifier();
      var result = [];
      for (var i = 1, lineCount = model.getLineCount(); i <= lineCount; i++) {
        var line = model.getLineContent(i);
        var len = line.length;
        var j = 0;
        var linkBeginIndex = 0;
        var linkBeginChCode = 0;
        var state = 1; /* Start */
        var hasOpenParens = false;
        var hasOpenSquareBracket = false;
        var hasOpenCurlyBracket = false;
        while (j < len) {
          var resetStateMachine = false;
          var chCode = line.charCodeAt(j);
          if (state === 13 /* Accept */) {
            var chClass = void 0;
            switch (chCode) {
              case 40 /* OpenParen */:
                hasOpenParens = true;
                chClass = 0 /* None */;
                break;
              case 41 /* CloseParen */:
                chClass = hasOpenParens ? 0 /* None */ : 1 /* ForceTermination */;
                break;
              case 91 /* OpenSquareBracket */:
                hasOpenSquareBracket = true;
                chClass = 0 /* None */;
                break;
              case 93 /* CloseSquareBracket */:
                chClass = hasOpenSquareBracket ? 0 /* None */ : 1 /* ForceTermination */;
                break;
              case 123 /* OpenCurlyBrace */:
                hasOpenCurlyBracket = true;
                chClass = 0 /* None */;
                break;
              case 125 /* CloseCurlyBrace */:
                chClass = hasOpenCurlyBracket ? 0 /* None */ : 1 /* ForceTermination */;
                break;
              /* The following three rules make it that ' or " or ` are allowed inside links if the link began with a different one */
              case 39 /* SingleQuote */:
                chClass =
                  linkBeginChCode === 34 /* DoubleQuote */ || linkBeginChCode === 96 /* BackTick */
                    ? 0 /* None */
                    : 1 /* ForceTermination */;
                break;
              case 34 /* DoubleQuote */:
                chClass =
                  linkBeginChCode === 39 /* SingleQuote */ || linkBeginChCode === 96 /* BackTick */
                    ? 0 /* None */
                    : 1 /* ForceTermination */;
                break;
              case 96 /* BackTick */:
                chClass =
                  linkBeginChCode === 39 /* SingleQuote */ ||
                  linkBeginChCode === 34 /* DoubleQuote */
                    ? 0 /* None */
                    : 1 /* ForceTermination */;
                break;
              default:
                chClass = classifier.get(chCode);
            }
            // Check if character terminates link
            if (chClass === 1 /* ForceTermination */) {
              result.push(LinkComputer._createLink(classifier, line, i, linkBeginIndex, j));
              resetStateMachine = true;
            }
          } else if (state === 12 /* End */) {
            var chClass = void 0;
            if (chCode === 91 /* OpenSquareBracket */) {
              // Allow for the authority part to contain ipv6 addresses which contain [ and ]
              hasOpenSquareBracket = true;
              chClass = 0 /* None */;
            } else {
              chClass = classifier.get(chCode);
            }
            // Check if character terminates link
            if (chClass === 1 /* ForceTermination */) {
              resetStateMachine = true;
            } else {
              state = 13 /* Accept */;
            }
          } else {
            state = stateMachine.nextState(state, chCode);
            if (state === 0 /* Invalid */) {
              resetStateMachine = true;
            }
          }
          if (resetStateMachine) {
            state = 1 /* Start */;
            hasOpenParens = false;
            hasOpenSquareBracket = false;
            hasOpenCurlyBracket = false;
            // Record where the link started
            linkBeginIndex = j + 1;
            linkBeginChCode = chCode;
          }
          j++;
        }
        if (state === 13 /* Accept */) {
          result.push(LinkComputer._createLink(classifier, line, i, linkBeginIndex, len));
        }
      }
      return result;
    };
    return LinkComputer;
  })();
  /**
   * Returns an array of all links contains in the provided
   * document. *Note* that this operation is computational
   * expensive and should not run in the UI thread.
   */
  function computeLinks(model) {
    if (
      !model ||
      typeof model.getLineCount !== 'function' ||
      typeof model.getLineContent !== 'function'
    ) {
      // Unknown caller!
      return [];
    }
    return LinkComputer.computeLinks(model);
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var BasicInplaceReplace = /** @class */ (function() {
    function BasicInplaceReplace() {
      this._defaultValueSet = [
        ['true', 'false'],
        ['True', 'False'],
        ['Private', 'Public', 'Friend', 'ReadOnly', 'Partial', 'Protected', 'WriteOnly'],
        ['public', 'protected', 'private'],
      ];
    }
    BasicInplaceReplace.prototype.navigateValueSet = function(range1, text1, range2, text2, up) {
      if (range1 && text1) {
        var result = this.doNavigateValueSet(text1, up);
        if (result) {
          return {
            range: range1,
            value: result,
          };
        }
      }
      if (range2 && text2) {
        var result = this.doNavigateValueSet(text2, up);
        if (result) {
          return {
            range: range2,
            value: result,
          };
        }
      }
      return null;
    };
    BasicInplaceReplace.prototype.doNavigateValueSet = function(text, up) {
      var numberResult = this.numberReplace(text, up);
      if (numberResult !== null) {
        return numberResult;
      }
      return this.textReplace(text, up);
    };
    BasicInplaceReplace.prototype.numberReplace = function(value, up) {
      var precision = Math.pow(10, value.length - (value.lastIndexOf('.') + 1));
      var n1 = Number(value);
      var n2 = parseFloat(value);
      if (!isNaN(n1) && !isNaN(n2) && n1 === n2) {
        if (n1 === 0 && !up) {
          return null; // don't do negative
          //			} else if(n1 === 9 && up) {
          //				return null; // don't insert 10 into a number
        } else {
          n1 = Math.floor(n1 * precision);
          n1 += up ? precision : -precision;
          return String(n1 / precision);
        }
      }
      return null;
    };
    BasicInplaceReplace.prototype.textReplace = function(value, up) {
      return this.valueSetsReplace(this._defaultValueSet, value, up);
    };
    BasicInplaceReplace.prototype.valueSetsReplace = function(valueSets, value, up) {
      var result = null;
      for (var i = 0, len = valueSets.length; result === null && i < len; i++) {
        result = this.valueSetReplace(valueSets[i], value, up);
      }
      return result;
    };
    BasicInplaceReplace.prototype.valueSetReplace = function(valueSet, value, up) {
      var idx = valueSet.indexOf(value);
      if (idx >= 0) {
        idx += up ? +1 : -1;
        if (idx < 0) {
          idx = valueSet.length - 1;
        } else {
          idx %= valueSet.length;
        }
        return valueSet[idx];
      }
      return null;
    };
    BasicInplaceReplace.INSTANCE = new BasicInplaceReplace();
    return BasicInplaceReplace;
  })();

  /*!
    Copyright (c) 2014 Taylor Hakes
    Copyright (c) 2014 Forbes Lindesay
     */
  (function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined'
      ? factory()
      : typeof define === 'function' && define.amd
      ? define(factory)
      : factory();
  })(undefined, function() {
    /**
     * @this {Promise}
     */
    function finallyConstructor(callback) {
      var constructor = this.constructor;
      return this.then(
        function(value) {
          return constructor.resolve(callback()).then(function() {
            return value;
          });
        },
        function(reason) {
          return constructor.resolve(callback()).then(function() {
            return constructor.reject(reason);
          });
        }
      );
    }

    // Store setTimeout reference so promise-polyfill will be unaffected by
    // other code modifying setTimeout (like sinon.useFakeTimers())
    var setTimeoutFunc = setTimeout;

    function noop() {}

    // Polyfill for Function.prototype.bind
    function bind(fn, thisArg) {
      return function() {
        fn.apply(thisArg, arguments);
      };
    }

    /**
     * @constructor
     * @param {Function} fn
     */
    function Promise(fn) {
      if (!(this instanceof Promise)) throw new TypeError('Promises must be constructed via new');
      if (typeof fn !== 'function') throw new TypeError('not a function');
      /** @type {!number} */
      this._state = 0;
      /** @type {!boolean} */
      this._handled = false;
      /** @type {Promise|undefined} */
      this._value = undefined;
      /** @type {!Array<!Function>} */
      this._deferreds = [];

      doResolve(fn, this);
    }

    function handle(self, deferred) {
      while (self._state === 3) {
        self = self._value;
      }
      if (self._state === 0) {
        self._deferreds.push(deferred);
        return;
      }
      self._handled = true;
      Promise._immediateFn(function() {
        var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
        if (cb === null) {
          (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
          return;
        }
        var ret;
        try {
          ret = cb(self._value);
        } catch (e) {
          reject(deferred.promise, e);
          return;
        }
        resolve(deferred.promise, ret);
      });
    }

    function resolve(self, newValue) {
      try {
        // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
        if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.');
        if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
          var then = newValue.then;
          if (newValue instanceof Promise) {
            self._state = 3;
            self._value = newValue;
            finale(self);
            return;
          } else if (typeof then === 'function') {
            doResolve(bind(then, newValue), self);
            return;
          }
        }
        self._state = 1;
        self._value = newValue;
        finale(self);
      } catch (e) {
        reject(self, e);
      }
    }

    function reject(self, newValue) {
      self._state = 2;
      self._value = newValue;
      finale(self);
    }

    function finale(self) {
      if (self._state === 2 && self._deferreds.length === 0) {
        Promise._immediateFn(function() {
          if (!self._handled) {
            Promise._unhandledRejectionFn(self._value);
          }
        });
      }

      for (var i = 0, len = self._deferreds.length; i < len; i++) {
        handle(self, self._deferreds[i]);
      }
      self._deferreds = null;
    }

    /**
     * @constructor
     */
    function Handler(onFulfilled, onRejected, promise) {
      this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
      this.onRejected = typeof onRejected === 'function' ? onRejected : null;
      this.promise = promise;
    }

    /**
     * Take a potentially misbehaving resolver function and make sure
     * onFulfilled and onRejected are only called once.
     *
     * Makes no guarantees about asynchrony.
     */
    function doResolve(fn, self) {
      var done = false;
      try {
        fn(
          function(value) {
            if (done) return;
            done = true;
            resolve(self, value);
          },
          function(reason) {
            if (done) return;
            done = true;
            reject(self, reason);
          }
        );
      } catch (ex) {
        if (done) return;
        done = true;
        reject(self, ex);
      }
    }

    Promise.prototype['catch'] = function(onRejected) {
      return this.then(null, onRejected);
    };

    Promise.prototype.then = function(onFulfilled, onRejected) {
      // @ts-ignore
      var prom = new this.constructor(noop);

      handle(this, new Handler(onFulfilled, onRejected, prom));
      return prom;
    };

    Promise.prototype['finally'] = finallyConstructor;

    Promise.all = function(arr) {
      return new Promise(function(resolve, reject) {
        if (!arr || typeof arr.length === 'undefined')
          throw new TypeError('Promise.all accepts an array');
        var args = Array.prototype.slice.call(arr);
        if (args.length === 0) return resolve([]);
        var remaining = args.length;

        function res(i, val) {
          try {
            if (val && (typeof val === 'object' || typeof val === 'function')) {
              var then = val.then;
              if (typeof then === 'function') {
                then.call(
                  val,
                  function(val) {
                    res(i, val);
                  },
                  reject
                );
                return;
              }
            }
            args[i] = val;
            if (--remaining === 0) {
              resolve(args);
            }
          } catch (ex) {
            reject(ex);
          }
        }

        for (var i = 0; i < args.length; i++) {
          res(i, args[i]);
        }
      });
    };

    Promise.resolve = function(value) {
      if (value && typeof value === 'object' && value.constructor === Promise) {
        return value;
      }

      return new Promise(function(resolve) {
        resolve(value);
      });
    };

    Promise.reject = function(value) {
      return new Promise(function(resolve, reject) {
        reject(value);
      });
    };

    Promise.race = function(values) {
      return new Promise(function(resolve, reject) {
        for (var i = 0, len = values.length; i < len; i++) {
          values[i].then(resolve, reject);
        }
      });
    };

    // Use polyfill for setImmediate for performance gains
    Promise._immediateFn =
      (typeof setImmediate === 'function' &&
        function(fn) {
          setImmediate(fn);
        }) ||
      function(fn) {
        setTimeoutFunc(fn, 0);
      };

    Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
      if (typeof console !== 'undefined' && console) {
        console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
      }
    };

    /** @suppress {undefinedVars} */
    var globalNS = (function() {
      // the only reliable means to get the global object is
      // `Function('return this')()`
      // However, this causes CSP violations in Chrome apps.
      if (typeof self !== 'undefined') {
        return self;
      }
      if (typeof window !== 'undefined') {
        return window;
      }
      if (typeof global !== 'undefined') {
        return global;
      }
      throw new Error('unable to locate global object');
    })();

    if (!('Promise' in globalNS)) {
      globalNS['Promise'] = Promise;
    } else if (!globalNS.Promise.prototype['finally']) {
      globalNS.Promise.prototype['finally'] = finallyConstructor;
    }
  });

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  function once(fn) {
    var _this = this;
    var didCall = false;
    var result;
    return function() {
      if (didCall) {
        return result;
      }
      didCall = true;
      result = fn.apply(_this, arguments);
      return result;
    };
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var Node = /** @class */ (function() {
    function Node(element) {
      this.element = element;
      this.next = Node.Undefined;
      this.prev = Node.Undefined;
    }
    Node.Undefined = new Node(undefined);
    return Node;
  })();
  var LinkedList = /** @class */ (function() {
    function LinkedList() {
      this._first = Node.Undefined;
      this._last = Node.Undefined;
      this._size = 0;
    }
    Object.defineProperty(LinkedList.prototype, 'size', {
      get: function() {
        return this._size;
      },
      enumerable: true,
      configurable: true,
    });
    LinkedList.prototype.isEmpty = function() {
      return this._first === Node.Undefined;
    };
    LinkedList.prototype.clear = function() {
      this._first = Node.Undefined;
      this._last = Node.Undefined;
      this._size = 0;
    };
    LinkedList.prototype.unshift = function(element) {
      return this._insert(element, false);
    };
    LinkedList.prototype.push = function(element) {
      return this._insert(element, true);
    };
    LinkedList.prototype._insert = function(element, atTheEnd) {
      var _this = this;
      var newNode = new Node(element);
      if (this._first === Node.Undefined) {
        this._first = newNode;
        this._last = newNode;
      } else if (atTheEnd) {
        // push
        var oldLast = this._last;
        this._last = newNode;
        newNode.prev = oldLast;
        oldLast.next = newNode;
      } else {
        // unshift
        var oldFirst = this._first;
        this._first = newNode;
        newNode.next = oldFirst;
        oldFirst.prev = newNode;
      }
      this._size += 1;
      var didRemove = false;
      return function() {
        if (!didRemove) {
          didRemove = true;
          _this._remove(newNode);
        }
      };
    };
    LinkedList.prototype.shift = function() {
      if (this._first === Node.Undefined) {
        return undefined;
      } else {
        var res = this._first.element;
        this._remove(this._first);
        return res;
      }
    };
    LinkedList.prototype._remove = function(node) {
      if (node.prev !== Node.Undefined && node.next !== Node.Undefined) {
        // middle
        var anchor = node.prev;
        anchor.next = node.next;
        node.next.prev = anchor;
      } else if (node.prev === Node.Undefined && node.next === Node.Undefined) {
        // only node
        this._first = Node.Undefined;
        this._last = Node.Undefined;
      } else if (node.next === Node.Undefined) {
        // last
        this._last = this._last.prev;
        this._last.next = Node.Undefined;
      } else if (node.prev === Node.Undefined) {
        // first
        this._first = this._first.next;
        this._first.prev = Node.Undefined;
      }
      // done
      this._size -= 1;
    };
    LinkedList.prototype.iterator = function() {
      var element;
      var node = this._first;
      return {
        next: function() {
          if (node === Node.Undefined) {
            return FIN;
          }
          if (!element) {
            element = { done: false, value: node.element };
          } else {
            element.value = node.element;
          }
          node = node.next;
          return element;
        },
      };
    };
    LinkedList.prototype.toArray = function() {
      var result = [];
      for (var node = this._first; node !== Node.Undefined; node = node.next) {
        result.push(node.element);
      }
      return result;
    };
    return LinkedList;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var __extends$3 =
    (undefined && undefined.__extends) ||
    (function() {
      var extendStatics = function(d, b) {
        extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function(d, b) {
              d.__proto__ = b;
            }) ||
          function(d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();
  var Event;
  (function(Event) {
    var _disposable = { dispose: function() {} };
    Event.None = function() {
      return _disposable;
    };
    /**
     * Given an event, returns another event which only fires once.
     */
    function once(event) {
      return function(listener, thisArgs, disposables) {
        if (thisArgs === void 0) {
          thisArgs = null;
        }
        // we need this, in case the event fires during the listener call
        var didFire = false;
        var result;
        result = event(
          function(e) {
            if (didFire) {
              return;
            } else if (result) {
              result.dispose();
            } else {
              didFire = true;
            }
            return listener.call(thisArgs, e);
          },
          null,
          disposables
        );
        if (didFire) {
          result.dispose();
        }
        return result;
      };
    }
    Event.once = once;
    /**
     * Given an event and a `map` function, returns another event which maps each element
     * throught the mapping function.
     */
    function map(event, map) {
      return snapshot(function(listener, thisArgs, disposables) {
        if (thisArgs === void 0) {
          thisArgs = null;
        }
        return event(
          function(i) {
            return listener.call(thisArgs, map(i));
          },
          null,
          disposables
        );
      });
    }
    Event.map = map;
    /**
     * Given an event and an `each` function, returns another identical event and calls
     * the `each` function per each element.
     */
    function forEach(event, each) {
      return snapshot(function(listener, thisArgs, disposables) {
        if (thisArgs === void 0) {
          thisArgs = null;
        }
        return event(
          function(i) {
            each(i);
            listener.call(thisArgs, i);
          },
          null,
          disposables
        );
      });
    }
    Event.forEach = forEach;
    function filter(event, filter) {
      return snapshot(function(listener, thisArgs, disposables) {
        if (thisArgs === void 0) {
          thisArgs = null;
        }
        return event(
          function(e) {
            return filter(e) && listener.call(thisArgs, e);
          },
          null,
          disposables
        );
      });
    }
    Event.filter = filter;
    /**
     * Given an event, returns the same event but typed as `Event<void>`.
     */
    function signal(event) {
      return event;
    }
    Event.signal = signal;
    /**
     * Given a collection of events, returns a single event which emits
     * whenever any of the provided events emit.
     */
    function any() {
      var events = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        events[_i] = arguments[_i];
      }
      return function(listener, thisArgs, disposables) {
        if (thisArgs === void 0) {
          thisArgs = null;
        }
        return combinedDisposable(
          events.map(function(event) {
            return event(
              function(e) {
                return listener.call(thisArgs, e);
              },
              null,
              disposables
            );
          })
        );
      };
    }
    Event.any = any;
    /**
     * Given an event and a `merge` function, returns another event which maps each element
     * and the cummulative result throught the `merge` function. Similar to `map`, but with memory.
     */
    function reduce(event, merge, initial) {
      var output = initial;
      return map(event, function(e) {
        output = merge(output, e);
        return output;
      });
    }
    Event.reduce = reduce;
    /**
     * Given a chain of event processing functions (filter, map, etc), each
     * function will be invoked per event & per listener. Snapshotting an event
     * chain allows each function to be invoked just once per event.
     */
    function snapshot(event) {
      var listener;
      var emitter = new Emitter({
        onFirstListenerAdd: function() {
          listener = event(emitter.fire, emitter);
        },
        onLastListenerRemove: function() {
          listener.dispose();
        },
      });
      return emitter.event;
    }
    Event.snapshot = snapshot;
    function debounce(event, merge, delay, leading, leakWarningThreshold) {
      if (delay === void 0) {
        delay = 100;
      }
      if (leading === void 0) {
        leading = false;
      }
      var subscription;
      var output = undefined;
      var handle = undefined;
      var numDebouncedCalls = 0;
      var emitter = new Emitter({
        leakWarningThreshold: leakWarningThreshold,
        onFirstListenerAdd: function() {
          subscription = event(function(cur) {
            numDebouncedCalls++;
            output = merge(output, cur);
            if (leading && !handle) {
              emitter.fire(output);
            }
            clearTimeout(handle);
            handle = setTimeout(function() {
              var _output = output;
              output = undefined;
              handle = undefined;
              if (!leading || numDebouncedCalls > 1) {
                emitter.fire(_output);
              }
              numDebouncedCalls = 0;
            }, delay);
          });
        },
        onLastListenerRemove: function() {
          subscription.dispose();
        },
      });
      return emitter.event;
    }
    Event.debounce = debounce;
    /**
     * Given an event, it returns another event which fires only once and as soon as
     * the input event emits. The event data is the number of millis it took for the
     * event to fire.
     */
    function stopwatch(event) {
      var start = new Date().getTime();
      return map(once(event), function(_) {
        return new Date().getTime() - start;
      });
    }
    Event.stopwatch = stopwatch;
    /**
     * Given an event, it returns another event which fires only when the event
     * element changes.
     */
    function latch(event) {
      var firstCall = true;
      var cache;
      return filter(event, function(value) {
        var shouldEmit = firstCall || value !== cache;
        firstCall = false;
        cache = value;
        return shouldEmit;
      });
    }
    Event.latch = latch;
    /**
     * Buffers the provided event until a first listener comes
     * along, at which point fire all the events at once and
     * pipe the event from then on.
     *
     * ```typescript
     * const emitter = new Emitter<number>();
     * const event = emitter.event;
     * const bufferedEvent = buffer(event);
     *
     * emitter.fire(1);
     * emitter.fire(2);
     * emitter.fire(3);
     * // nothing...
     *
     * const listener = bufferedEvent(num => console.log(num));
     * // 1, 2, 3
     *
     * emitter.fire(4);
     * // 4
     * ```
     */
    function buffer(event, nextTick, _buffer) {
      if (nextTick === void 0) {
        nextTick = false;
      }
      if (_buffer === void 0) {
        _buffer = [];
      }
      var buffer = _buffer.slice();
      var listener = event(function(e) {
        if (buffer) {
          buffer.push(e);
        } else {
          emitter.fire(e);
        }
      });
      var flush = function() {
        if (buffer) {
          buffer.forEach(function(e) {
            return emitter.fire(e);
          });
        }
        buffer = null;
      };
      var emitter = new Emitter({
        onFirstListenerAdd: function() {
          if (!listener) {
            listener = event(function(e) {
              return emitter.fire(e);
            });
          }
        },
        onFirstListenerDidAdd: function() {
          if (buffer) {
            if (nextTick) {
              setTimeout(flush);
            } else {
              flush();
            }
          }
        },
        onLastListenerRemove: function() {
          if (listener) {
            listener.dispose();
          }
          listener = null;
        },
      });
      return emitter.event;
    }
    Event.buffer = buffer;
    var ChainableEvent = /** @class */ (function() {
      function ChainableEvent(event) {
        this.event = event;
      }
      ChainableEvent.prototype.map = function(fn) {
        return new ChainableEvent(map(this.event, fn));
      };
      ChainableEvent.prototype.forEach = function(fn) {
        return new ChainableEvent(forEach(this.event, fn));
      };
      ChainableEvent.prototype.filter = function(fn) {
        return new ChainableEvent(filter(this.event, fn));
      };
      ChainableEvent.prototype.reduce = function(merge, initial) {
        return new ChainableEvent(reduce(this.event, merge, initial));
      };
      ChainableEvent.prototype.latch = function() {
        return new ChainableEvent(latch(this.event));
      };
      ChainableEvent.prototype.on = function(listener, thisArgs, disposables) {
        return this.event(listener, thisArgs, disposables);
      };
      ChainableEvent.prototype.once = function(listener, thisArgs, disposables) {
        return once(this.event)(listener, thisArgs, disposables);
      };
      return ChainableEvent;
    })();
    function chain(event) {
      return new ChainableEvent(event);
    }
    Event.chain = chain;
    function fromNodeEventEmitter(emitter, eventName, map) {
      if (map === void 0) {
        map = function(id) {
          return id;
        };
      }
      var fn = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return result.fire(map.apply(void 0, args));
      };
      var onFirstListenerAdd = function() {
        return emitter.on(eventName, fn);
      };
      var onLastListenerRemove = function() {
        return emitter.removeListener(eventName, fn);
      };
      var result = new Emitter({
        onFirstListenerAdd: onFirstListenerAdd,
        onLastListenerRemove: onLastListenerRemove,
      });
      return result.event;
    }
    Event.fromNodeEventEmitter = fromNodeEventEmitter;
    function fromPromise(promise) {
      var emitter = new Emitter();
      var shouldEmit = false;
      promise
        .then(undefined, function() {
          return null;
        })
        .then(function() {
          if (!shouldEmit) {
            setTimeout(function() {
              return emitter.fire(undefined);
            }, 0);
          } else {
            emitter.fire(undefined);
          }
        });
      shouldEmit = true;
      return emitter.event;
    }
    Event.fromPromise = fromPromise;
    function toPromise(event) {
      return new Promise(function(c) {
        return once(event)(c);
      });
    }
    Event.toPromise = toPromise;
  })(Event || (Event = {}));
  /**
   * The Emitter can be used to expose an Event to the public
   * to fire it from the insides.
   * Sample:
   class Document {

            private _onDidChange = new Emitter<(value:string)=>any>();

            public onDidChange = this._onDidChange.event;

            // getter-style
            // get onDidChange(): Event<(value:string)=>any> {
            // 	return this._onDidChange.event;
            // }

            private _doIt() {
                //...
                this._onDidChange.fire(value);
            }
        }
   */
  var Emitter = /** @class */ (function() {
    function Emitter(options) {
      this._disposed = false;
      this._options = options;
      this._leakageMon = undefined;
    }
    Object.defineProperty(Emitter.prototype, 'event', {
      /**
       * For the public to allow to subscribe
       * to events from this Emitter
       */
      get: function() {
        var _this = this;
        if (!this._event) {
          this._event = function(listener, thisArgs, disposables) {
            if (!_this._listeners) {
              _this._listeners = new LinkedList();
            }
            var firstListener = _this._listeners.isEmpty();
            if (firstListener && _this._options && _this._options.onFirstListenerAdd) {
              _this._options.onFirstListenerAdd(_this);
            }
            var remove = _this._listeners.push(!thisArgs ? listener : [listener, thisArgs]);
            if (firstListener && _this._options && _this._options.onFirstListenerDidAdd) {
              _this._options.onFirstListenerDidAdd(_this);
            }
            if (_this._options && _this._options.onListenerDidAdd) {
              _this._options.onListenerDidAdd(_this, listener, thisArgs);
            }
            // check and record this emitter for potential leakage
            var removeMonitor;
            if (_this._leakageMon) {
              removeMonitor = _this._leakageMon.check(_this._listeners.size);
            }
            var result;
            result = {
              dispose: function() {
                if (removeMonitor) {
                  removeMonitor();
                }
                result.dispose = Emitter._noop;
                if (!_this._disposed) {
                  remove();
                  if (_this._options && _this._options.onLastListenerRemove) {
                    var hasListeners = _this._listeners && !_this._listeners.isEmpty();
                    if (!hasListeners) {
                      _this._options.onLastListenerRemove(_this);
                    }
                  }
                }
              },
            };
            if (Array.isArray(disposables)) {
              disposables.push(result);
            }
            return result;
          };
        }
        return this._event;
      },
      enumerable: true,
      configurable: true,
    });
    /**
     * To be kept private to fire an event to
     * subscribers
     */
    Emitter.prototype.fire = function(event) {
      if (this._listeners) {
        // put all [listener,event]-pairs into delivery queue
        // then emit all event. an inner/nested event might be
        // the driver of this
        if (!this._deliveryQueue) {
          this._deliveryQueue = new LinkedList();
        }
        for (var iter = this._listeners.iterator(), e = iter.next(); !e.done; e = iter.next()) {
          this._deliveryQueue.push([e.value, event]);
        }
        while (this._deliveryQueue.size > 0) {
          var _a = this._deliveryQueue.shift(),
            listener = _a[0],
            event_1 = _a[1];
          try {
            if (typeof listener === 'function') {
              listener.call(undefined, event_1);
            } else {
              listener[0].call(listener[1], event_1);
            }
          } catch (e) {
            onUnexpectedError(e);
          }
        }
      }
    };
    Emitter.prototype.dispose = function() {
      if (this._listeners) {
        this._listeners.clear();
      }
      if (this._deliveryQueue) {
        this._deliveryQueue.clear();
      }
      if (this._leakageMon) {
        this._leakageMon.dispose();
      }
      this._disposed = true;
    };
    Emitter._noop = function() {};
    return Emitter;
  })();
  var PauseableEmitter = /** @class */ (function(_super) {
    __extends$3(PauseableEmitter, _super);
    function PauseableEmitter(options) {
      var _this = _super.call(this, options) || this;
      _this._isPaused = 0;
      _this._eventQueue = new LinkedList();
      _this._mergeFn = options && options.merge;
      return _this;
    }
    PauseableEmitter.prototype.pause = function() {
      this._isPaused++;
    };
    PauseableEmitter.prototype.resume = function() {
      if (this._isPaused !== 0 && --this._isPaused === 0) {
        if (this._mergeFn) {
          // use the merge function to create a single composite
          // event. make a copy in case firing pauses this emitter
          var events = this._eventQueue.toArray();
          this._eventQueue.clear();
          _super.prototype.fire.call(this, this._mergeFn(events));
        } else {
          // no merging, fire each event individually and test
          // that this emitter isn't paused halfway through
          while (!this._isPaused && this._eventQueue.size !== 0) {
            _super.prototype.fire.call(this, this._eventQueue.shift());
          }
        }
      }
    };
    PauseableEmitter.prototype.fire = function(event) {
      if (this._listeners) {
        if (this._isPaused !== 0) {
          this._eventQueue.push(event);
        } else {
          _super.prototype.fire.call(this, event);
        }
      }
    };
    return PauseableEmitter;
  })(Emitter);
  var EventMultiplexer = /** @class */ (function() {
    function EventMultiplexer() {
      var _this = this;
      this.hasListeners = false;
      this.events = [];
      this.emitter = new Emitter({
        onFirstListenerAdd: function() {
          return _this.onFirstListenerAdd();
        },
        onLastListenerRemove: function() {
          return _this.onLastListenerRemove();
        },
      });
    }
    Object.defineProperty(EventMultiplexer.prototype, 'event', {
      get: function() {
        return this.emitter.event;
      },
      enumerable: true,
      configurable: true,
    });
    EventMultiplexer.prototype.add = function(event) {
      var _this = this;
      var e = { event: event, listener: null };
      this.events.push(e);
      if (this.hasListeners) {
        this.hook(e);
      }
      var dispose = function() {
        if (_this.hasListeners) {
          _this.unhook(e);
        }
        var idx = _this.events.indexOf(e);
        _this.events.splice(idx, 1);
      };
      return toDisposable(once(dispose));
    };
    EventMultiplexer.prototype.onFirstListenerAdd = function() {
      var _this = this;
      this.hasListeners = true;
      this.events.forEach(function(e) {
        return _this.hook(e);
      });
    };
    EventMultiplexer.prototype.onLastListenerRemove = function() {
      var _this = this;
      this.hasListeners = false;
      this.events.forEach(function(e) {
        return _this.unhook(e);
      });
    };
    EventMultiplexer.prototype.hook = function(e) {
      var _this = this;
      e.listener = e.event(function(r) {
        return _this.emitter.fire(r);
      });
    };
    EventMultiplexer.prototype.unhook = function(e) {
      if (e.listener) {
        e.listener.dispose();
      }
      e.listener = null;
    };
    EventMultiplexer.prototype.dispose = function() {
      this.emitter.dispose();
    };
    return EventMultiplexer;
  })();
  /**
   * A Relay is an event forwarder which functions as a replugabble event pipe.
   * Once created, you can connect an input event to it and it will simply forward
   * events from that input event through its own `event` property. The `input`
   * can be changed at any point in time.
   */
  var Relay = /** @class */ (function() {
    function Relay() {
      var _this = this;
      this.listening = false;
      this.inputEvent = Event.None;
      this.inputEventListener = Disposable.None;
      this.emitter = new Emitter({
        onFirstListenerDidAdd: function() {
          _this.listening = true;
          _this.inputEventListener = _this.inputEvent(_this.emitter.fire, _this.emitter);
        },
        onLastListenerRemove: function() {
          _this.listening = false;
          _this.inputEventListener.dispose();
        },
      });
      this.event = this.emitter.event;
    }
    Object.defineProperty(Relay.prototype, 'input', {
      set: function(event) {
        this.inputEvent = event;
        if (this.listening) {
          this.inputEventListener.dispose();
          this.inputEventListener = event(this.emitter.fire, this.emitter);
        }
      },
      enumerable: true,
      configurable: true,
    });
    Relay.prototype.dispose = function() {
      this.inputEventListener.dispose();
      this.emitter.dispose();
    };
    return Relay;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var shortcutEvent = Object.freeze(function(callback, context) {
    var handle = setTimeout(callback.bind(context), 0);
    return {
      dispose: function() {
        clearTimeout(handle);
      },
    };
  });
  var CancellationToken;
  (function(CancellationToken) {
    function isCancellationToken(thing) {
      if (thing === CancellationToken.None || thing === CancellationToken.Cancelled) {
        return true;
      }
      if (thing instanceof MutableToken) {
        return true;
      }
      if (!thing || typeof thing !== 'object') {
        return false;
      }
      return (
        typeof thing.isCancellationRequested === 'boolean' &&
        typeof thing.onCancellationRequested === 'function'
      );
    }
    CancellationToken.isCancellationToken = isCancellationToken;
    CancellationToken.None = Object.freeze({
      isCancellationRequested: false,
      onCancellationRequested: Event.None,
    });
    CancellationToken.Cancelled = Object.freeze({
      isCancellationRequested: true,
      onCancellationRequested: shortcutEvent,
    });
  })(CancellationToken || (CancellationToken = {}));
  var MutableToken = /** @class */ (function() {
    function MutableToken() {
      this._isCancelled = false;
      this._emitter = null;
    }
    MutableToken.prototype.cancel = function() {
      if (!this._isCancelled) {
        this._isCancelled = true;
        if (this._emitter) {
          this._emitter.fire(undefined);
          this.dispose();
        }
      }
    };
    Object.defineProperty(MutableToken.prototype, 'isCancellationRequested', {
      get: function() {
        return this._isCancelled;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(MutableToken.prototype, 'onCancellationRequested', {
      get: function() {
        if (this._isCancelled) {
          return shortcutEvent;
        }
        if (!this._emitter) {
          this._emitter = new Emitter();
        }
        return this._emitter.event;
      },
      enumerable: true,
      configurable: true,
    });
    MutableToken.prototype.dispose = function() {
      if (this._emitter) {
        this._emitter.dispose();
        this._emitter = null;
      }
    };
    return MutableToken;
  })();
  var CancellationTokenSource = /** @class */ (function() {
    function CancellationTokenSource(parent) {
      this._token = undefined;
      this._parentListener = undefined;
      this._parentListener = parent && parent.onCancellationRequested(this.cancel, this);
    }
    Object.defineProperty(CancellationTokenSource.prototype, 'token', {
      get: function() {
        if (!this._token) {
          // be lazy and create the token only when
          // actually needed
          this._token = new MutableToken();
        }
        return this._token;
      },
      enumerable: true,
      configurable: true,
    });
    CancellationTokenSource.prototype.cancel = function() {
      if (!this._token) {
        // save an object by returning the default
        // cancelled token when cancellation happens
        // before someone asks for the token
        this._token = CancellationToken.Cancelled;
      } else if (this._token instanceof MutableToken) {
        // actually cancel
        this._token.cancel();
      }
    };
    CancellationTokenSource.prototype.dispose = function() {
      if (this._parentListener) {
        this._parentListener.dispose();
      }
      if (!this._token) {
        // ensure to initialize with an empty token if we had none
        this._token = CancellationToken.None;
      } else if (this._token instanceof MutableToken) {
        // actually dispose
        this._token.dispose();
      }
    };
    return CancellationTokenSource;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var KeyCodeStrMap = /** @class */ (function() {
    function KeyCodeStrMap() {
      this._keyCodeToStr = [];
      this._strToKeyCode = Object.create(null);
    }
    KeyCodeStrMap.prototype.define = function(keyCode, str) {
      this._keyCodeToStr[keyCode] = str;
      this._strToKeyCode[str.toLowerCase()] = keyCode;
    };
    KeyCodeStrMap.prototype.keyCodeToStr = function(keyCode) {
      return this._keyCodeToStr[keyCode];
    };
    KeyCodeStrMap.prototype.strToKeyCode = function(str) {
      return this._strToKeyCode[str.toLowerCase()] || 0 /* Unknown */;
    };
    return KeyCodeStrMap;
  })();
  var uiMap = new KeyCodeStrMap();
  var userSettingsUSMap = new KeyCodeStrMap();
  var userSettingsGeneralMap = new KeyCodeStrMap();
  (function() {
    function define(keyCode, uiLabel, usUserSettingsLabel, generalUserSettingsLabel) {
      if (usUserSettingsLabel === void 0) {
        usUserSettingsLabel = uiLabel;
      }
      if (generalUserSettingsLabel === void 0) {
        generalUserSettingsLabel = usUserSettingsLabel;
      }
      uiMap.define(keyCode, uiLabel);
      userSettingsUSMap.define(keyCode, usUserSettingsLabel);
      userSettingsGeneralMap.define(keyCode, generalUserSettingsLabel);
    }
    define(0 /* Unknown */, 'unknown');
    define(1 /* Backspace */, 'Backspace');
    define(2 /* Tab */, 'Tab');
    define(3 /* Enter */, 'Enter');
    define(4 /* Shift */, 'Shift');
    define(5 /* Ctrl */, 'Ctrl');
    define(6 /* Alt */, 'Alt');
    define(7 /* PauseBreak */, 'PauseBreak');
    define(8 /* CapsLock */, 'CapsLock');
    define(9 /* Escape */, 'Escape');
    define(10 /* Space */, 'Space');
    define(11 /* PageUp */, 'PageUp');
    define(12 /* PageDown */, 'PageDown');
    define(13 /* End */, 'End');
    define(14 /* Home */, 'Home');
    define(15 /* LeftArrow */, 'LeftArrow', 'Left');
    define(16 /* UpArrow */, 'UpArrow', 'Up');
    define(17 /* RightArrow */, 'RightArrow', 'Right');
    define(18 /* DownArrow */, 'DownArrow', 'Down');
    define(19 /* Insert */, 'Insert');
    define(20 /* Delete */, 'Delete');
    define(21 /* KEY_0 */, '0');
    define(22 /* KEY_1 */, '1');
    define(23 /* KEY_2 */, '2');
    define(24 /* KEY_3 */, '3');
    define(25 /* KEY_4 */, '4');
    define(26 /* KEY_5 */, '5');
    define(27 /* KEY_6 */, '6');
    define(28 /* KEY_7 */, '7');
    define(29 /* KEY_8 */, '8');
    define(30 /* KEY_9 */, '9');
    define(31 /* KEY_A */, 'A');
    define(32 /* KEY_B */, 'B');
    define(33 /* KEY_C */, 'C');
    define(34 /* KEY_D */, 'D');
    define(35 /* KEY_E */, 'E');
    define(36 /* KEY_F */, 'F');
    define(37 /* KEY_G */, 'G');
    define(38 /* KEY_H */, 'H');
    define(39 /* KEY_I */, 'I');
    define(40 /* KEY_J */, 'J');
    define(41 /* KEY_K */, 'K');
    define(42 /* KEY_L */, 'L');
    define(43 /* KEY_M */, 'M');
    define(44 /* KEY_N */, 'N');
    define(45 /* KEY_O */, 'O');
    define(46 /* KEY_P */, 'P');
    define(47 /* KEY_Q */, 'Q');
    define(48 /* KEY_R */, 'R');
    define(49 /* KEY_S */, 'S');
    define(50 /* KEY_T */, 'T');
    define(51 /* KEY_U */, 'U');
    define(52 /* KEY_V */, 'V');
    define(53 /* KEY_W */, 'W');
    define(54 /* KEY_X */, 'X');
    define(55 /* KEY_Y */, 'Y');
    define(56 /* KEY_Z */, 'Z');
    define(57 /* Meta */, 'Meta');
    define(58 /* ContextMenu */, 'ContextMenu');
    define(59 /* F1 */, 'F1');
    define(60 /* F2 */, 'F2');
    define(61 /* F3 */, 'F3');
    define(62 /* F4 */, 'F4');
    define(63 /* F5 */, 'F5');
    define(64 /* F6 */, 'F6');
    define(65 /* F7 */, 'F7');
    define(66 /* F8 */, 'F8');
    define(67 /* F9 */, 'F9');
    define(68 /* F10 */, 'F10');
    define(69 /* F11 */, 'F11');
    define(70 /* F12 */, 'F12');
    define(71 /* F13 */, 'F13');
    define(72 /* F14 */, 'F14');
    define(73 /* F15 */, 'F15');
    define(74 /* F16 */, 'F16');
    define(75 /* F17 */, 'F17');
    define(76 /* F18 */, 'F18');
    define(77 /* F19 */, 'F19');
    define(78 /* NumLock */, 'NumLock');
    define(79 /* ScrollLock */, 'ScrollLock');
    define(80 /* US_SEMICOLON */, ';', ';', 'OEM_1');
    define(81 /* US_EQUAL */, '=', '=', 'OEM_PLUS');
    define(82 /* US_COMMA */, ',', ',', 'OEM_COMMA');
    define(83 /* US_MINUS */, '-', '-', 'OEM_MINUS');
    define(84 /* US_DOT */, '.', '.', 'OEM_PERIOD');
    define(85 /* US_SLASH */, '/', '/', 'OEM_2');
    define(86 /* US_BACKTICK */, '`', '`', 'OEM_3');
    define(110 /* ABNT_C1 */, 'ABNT_C1');
    define(111 /* ABNT_C2 */, 'ABNT_C2');
    define(87 /* US_OPEN_SQUARE_BRACKET */, '[', '[', 'OEM_4');
    define(88 /* US_BACKSLASH */, '\\', '\\', 'OEM_5');
    define(89 /* US_CLOSE_SQUARE_BRACKET */, ']', ']', 'OEM_6');
    define(90 /* US_QUOTE */, "'", "'", 'OEM_7');
    define(91 /* OEM_8 */, 'OEM_8');
    define(92 /* OEM_102 */, 'OEM_102');
    define(93 /* NUMPAD_0 */, 'NumPad0');
    define(94 /* NUMPAD_1 */, 'NumPad1');
    define(95 /* NUMPAD_2 */, 'NumPad2');
    define(96 /* NUMPAD_3 */, 'NumPad3');
    define(97 /* NUMPAD_4 */, 'NumPad4');
    define(98 /* NUMPAD_5 */, 'NumPad5');
    define(99 /* NUMPAD_6 */, 'NumPad6');
    define(100 /* NUMPAD_7 */, 'NumPad7');
    define(101 /* NUMPAD_8 */, 'NumPad8');
    define(102 /* NUMPAD_9 */, 'NumPad9');
    define(103 /* NUMPAD_MULTIPLY */, 'NumPad_Multiply');
    define(104 /* NUMPAD_ADD */, 'NumPad_Add');
    define(105 /* NUMPAD_SEPARATOR */, 'NumPad_Separator');
    define(106 /* NUMPAD_SUBTRACT */, 'NumPad_Subtract');
    define(107 /* NUMPAD_DECIMAL */, 'NumPad_Decimal');
    define(108 /* NUMPAD_DIVIDE */, 'NumPad_Divide');
  })();
  var KeyCodeUtils;
  (function(KeyCodeUtils) {
    function toString(keyCode) {
      return uiMap.keyCodeToStr(keyCode);
    }
    KeyCodeUtils.toString = toString;
    function fromString(key) {
      return uiMap.strToKeyCode(key);
    }
    KeyCodeUtils.fromString = fromString;
    function toUserSettingsUS(keyCode) {
      return userSettingsUSMap.keyCodeToStr(keyCode);
    }
    KeyCodeUtils.toUserSettingsUS = toUserSettingsUS;
    function toUserSettingsGeneral(keyCode) {
      return userSettingsGeneralMap.keyCodeToStr(keyCode);
    }
    KeyCodeUtils.toUserSettingsGeneral = toUserSettingsGeneral;
    function fromUserSettings(key) {
      return userSettingsUSMap.strToKeyCode(key) || userSettingsGeneralMap.strToKeyCode(key);
    }
    KeyCodeUtils.fromUserSettings = fromUserSettings;
  })(KeyCodeUtils || (KeyCodeUtils = {}));
  function KeyChord(firstPart, secondPart) {
    var chordPart = ((secondPart & 0x0000ffff) << 16) >>> 0;
    return (firstPart | chordPart) >>> 0;
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var __extends$4 =
    (undefined && undefined.__extends) ||
    (function() {
      var extendStatics = function(d, b) {
        extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function(d, b) {
              d.__proto__ = b;
            }) ||
          function(d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();
  /**
   * A selection in the editor.
   * The selection is a range that has an orientation.
   */
  var Selection = /** @class */ (function(_super) {
    __extends$4(Selection, _super);
    function Selection(
      selectionStartLineNumber,
      selectionStartColumn,
      positionLineNumber,
      positionColumn
    ) {
      var _this =
        _super.call(
          this,
          selectionStartLineNumber,
          selectionStartColumn,
          positionLineNumber,
          positionColumn
        ) || this;
      _this.selectionStartLineNumber = selectionStartLineNumber;
      _this.selectionStartColumn = selectionStartColumn;
      _this.positionLineNumber = positionLineNumber;
      _this.positionColumn = positionColumn;
      return _this;
    }
    /**
     * Clone this selection.
     */
    Selection.prototype.clone = function() {
      return new Selection(
        this.selectionStartLineNumber,
        this.selectionStartColumn,
        this.positionLineNumber,
        this.positionColumn
      );
    };
    /**
     * Transform to a human-readable representation.
     */
    Selection.prototype.toString = function() {
      return (
        '[' +
        this.selectionStartLineNumber +
        ',' +
        this.selectionStartColumn +
        ' -> ' +
        this.positionLineNumber +
        ',' +
        this.positionColumn +
        ']'
      );
    };
    /**
     * Test if equals other selection.
     */
    Selection.prototype.equalsSelection = function(other) {
      return Selection.selectionsEqual(this, other);
    };
    /**
     * Test if the two selections are equal.
     */
    Selection.selectionsEqual = function(a, b) {
      return (
        a.selectionStartLineNumber === b.selectionStartLineNumber &&
        a.selectionStartColumn === b.selectionStartColumn &&
        a.positionLineNumber === b.positionLineNumber &&
        a.positionColumn === b.positionColumn
      );
    };
    /**
     * Get directions (LTR or RTL).
     */
    Selection.prototype.getDirection = function() {
      if (
        this.selectionStartLineNumber === this.startLineNumber &&
        this.selectionStartColumn === this.startColumn
      ) {
        return 0 /* LTR */;
      }
      return 1 /* RTL */;
    };
    /**
     * Create a new selection with a different `positionLineNumber` and `positionColumn`.
     */
    Selection.prototype.setEndPosition = function(endLineNumber, endColumn) {
      if (this.getDirection() === 0 /* LTR */) {
        return new Selection(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
      }
      return new Selection(endLineNumber, endColumn, this.startLineNumber, this.startColumn);
    };
    /**
     * Get the position at `positionLineNumber` and `positionColumn`.
     */
    Selection.prototype.getPosition = function() {
      return new Position(this.positionLineNumber, this.positionColumn);
    };
    /**
     * Create a new selection with a different `selectionStartLineNumber` and `selectionStartColumn`.
     */
    Selection.prototype.setStartPosition = function(startLineNumber, startColumn) {
      if (this.getDirection() === 0 /* LTR */) {
        return new Selection(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
      }
      return new Selection(this.endLineNumber, this.endColumn, startLineNumber, startColumn);
    };
    // ----
    /**
     * Create a `Selection` from one or two positions
     */
    Selection.fromPositions = function(start, end) {
      if (end === void 0) {
        end = start;
      }
      return new Selection(start.lineNumber, start.column, end.lineNumber, end.column);
    };
    /**
     * Create a `Selection` from an `ISelection`.
     */
    Selection.liftSelection = function(sel) {
      return new Selection(
        sel.selectionStartLineNumber,
        sel.selectionStartColumn,
        sel.positionLineNumber,
        sel.positionColumn
      );
    };
    /**
     * `a` equals `b`.
     */
    Selection.selectionsArrEqual = function(a, b) {
      if ((a && !b) || (!a && b)) {
        return false;
      }
      if (!a && !b) {
        return true;
      }
      if (a.length !== b.length) {
        return false;
      }
      for (var i = 0, len = a.length; i < len; i++) {
        if (!this.selectionsEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    };
    /**
     * Test if `obj` is an `ISelection`.
     */
    Selection.isISelection = function(obj) {
      return (
        obj &&
        typeof obj.selectionStartLineNumber === 'number' &&
        typeof obj.selectionStartColumn === 'number' &&
        typeof obj.positionLineNumber === 'number' &&
        typeof obj.positionColumn === 'number'
      );
    };
    /**
     * Create with a direction.
     */
    Selection.createWithDirection = function(
      startLineNumber,
      startColumn,
      endLineNumber,
      endColumn,
      direction
    ) {
      if (direction === 0 /* LTR */) {
        return new Selection(startLineNumber, startColumn, endLineNumber, endColumn);
      }
      return new Selection(endLineNumber, endColumn, startLineNumber, startColumn);
    };
    return Selection;
  })(Range);

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var Token = /** @class */ (function() {
    function Token(offset, type, language) {
      this.offset = offset | 0; // @perf
      this.type = type;
      this.language = language;
    }
    Token.prototype.toString = function() {
      return '(' + this.offset + ', ' + this.type + ')';
    };
    return Token;
  })();

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  // THIS IS A GENERATED FILE. DO NOT EDIT DIRECTLY.
  var MarkerTag;
  (function(MarkerTag) {
    MarkerTag[(MarkerTag['Unnecessary'] = 1)] = 'Unnecessary';
  })(MarkerTag || (MarkerTag = {}));
  var MarkerSeverity;
  (function(MarkerSeverity) {
    MarkerSeverity[(MarkerSeverity['Hint'] = 1)] = 'Hint';
    MarkerSeverity[(MarkerSeverity['Info'] = 2)] = 'Info';
    MarkerSeverity[(MarkerSeverity['Warning'] = 4)] = 'Warning';
    MarkerSeverity[(MarkerSeverity['Error'] = 8)] = 'Error';
  })(MarkerSeverity || (MarkerSeverity = {}));
  /**
   * Virtual Key Codes, the value does not hold any inherent meaning.
   * Inspired somewhat from https://msdn.microsoft.com/en-us/library/windows/desktop/dd375731(v=vs.85).aspx
   * But these are "more general", as they should work across browsers & OS`s.
   */
  var KeyCode;
  (function(KeyCode) {
    /**
     * Placed first to cover the 0 value of the enum.
     */
    KeyCode[(KeyCode['Unknown'] = 0)] = 'Unknown';
    KeyCode[(KeyCode['Backspace'] = 1)] = 'Backspace';
    KeyCode[(KeyCode['Tab'] = 2)] = 'Tab';
    KeyCode[(KeyCode['Enter'] = 3)] = 'Enter';
    KeyCode[(KeyCode['Shift'] = 4)] = 'Shift';
    KeyCode[(KeyCode['Ctrl'] = 5)] = 'Ctrl';
    KeyCode[(KeyCode['Alt'] = 6)] = 'Alt';
    KeyCode[(KeyCode['PauseBreak'] = 7)] = 'PauseBreak';
    KeyCode[(KeyCode['CapsLock'] = 8)] = 'CapsLock';
    KeyCode[(KeyCode['Escape'] = 9)] = 'Escape';
    KeyCode[(KeyCode['Space'] = 10)] = 'Space';
    KeyCode[(KeyCode['PageUp'] = 11)] = 'PageUp';
    KeyCode[(KeyCode['PageDown'] = 12)] = 'PageDown';
    KeyCode[(KeyCode['End'] = 13)] = 'End';
    KeyCode[(KeyCode['Home'] = 14)] = 'Home';
    KeyCode[(KeyCode['LeftArrow'] = 15)] = 'LeftArrow';
    KeyCode[(KeyCode['UpArrow'] = 16)] = 'UpArrow';
    KeyCode[(KeyCode['RightArrow'] = 17)] = 'RightArrow';
    KeyCode[(KeyCode['DownArrow'] = 18)] = 'DownArrow';
    KeyCode[(KeyCode['Insert'] = 19)] = 'Insert';
    KeyCode[(KeyCode['Delete'] = 20)] = 'Delete';
    KeyCode[(KeyCode['KEY_0'] = 21)] = 'KEY_0';
    KeyCode[(KeyCode['KEY_1'] = 22)] = 'KEY_1';
    KeyCode[(KeyCode['KEY_2'] = 23)] = 'KEY_2';
    KeyCode[(KeyCode['KEY_3'] = 24)] = 'KEY_3';
    KeyCode[(KeyCode['KEY_4'] = 25)] = 'KEY_4';
    KeyCode[(KeyCode['KEY_5'] = 26)] = 'KEY_5';
    KeyCode[(KeyCode['KEY_6'] = 27)] = 'KEY_6';
    KeyCode[(KeyCode['KEY_7'] = 28)] = 'KEY_7';
    KeyCode[(KeyCode['KEY_8'] = 29)] = 'KEY_8';
    KeyCode[(KeyCode['KEY_9'] = 30)] = 'KEY_9';
    KeyCode[(KeyCode['KEY_A'] = 31)] = 'KEY_A';
    KeyCode[(KeyCode['KEY_B'] = 32)] = 'KEY_B';
    KeyCode[(KeyCode['KEY_C'] = 33)] = 'KEY_C';
    KeyCode[(KeyCode['KEY_D'] = 34)] = 'KEY_D';
    KeyCode[(KeyCode['KEY_E'] = 35)] = 'KEY_E';
    KeyCode[(KeyCode['KEY_F'] = 36)] = 'KEY_F';
    KeyCode[(KeyCode['KEY_G'] = 37)] = 'KEY_G';
    KeyCode[(KeyCode['KEY_H'] = 38)] = 'KEY_H';
    KeyCode[(KeyCode['KEY_I'] = 39)] = 'KEY_I';
    KeyCode[(KeyCode['KEY_J'] = 40)] = 'KEY_J';
    KeyCode[(KeyCode['KEY_K'] = 41)] = 'KEY_K';
    KeyCode[(KeyCode['KEY_L'] = 42)] = 'KEY_L';
    KeyCode[(KeyCode['KEY_M'] = 43)] = 'KEY_M';
    KeyCode[(KeyCode['KEY_N'] = 44)] = 'KEY_N';
    KeyCode[(KeyCode['KEY_O'] = 45)] = 'KEY_O';
    KeyCode[(KeyCode['KEY_P'] = 46)] = 'KEY_P';
    KeyCode[(KeyCode['KEY_Q'] = 47)] = 'KEY_Q';
    KeyCode[(KeyCode['KEY_R'] = 48)] = 'KEY_R';
    KeyCode[(KeyCode['KEY_S'] = 49)] = 'KEY_S';
    KeyCode[(KeyCode['KEY_T'] = 50)] = 'KEY_T';
    KeyCode[(KeyCode['KEY_U'] = 51)] = 'KEY_U';
    KeyCode[(KeyCode['KEY_V'] = 52)] = 'KEY_V';
    KeyCode[(KeyCode['KEY_W'] = 53)] = 'KEY_W';
    KeyCode[(KeyCode['KEY_X'] = 54)] = 'KEY_X';
    KeyCode[(KeyCode['KEY_Y'] = 55)] = 'KEY_Y';
    KeyCode[(KeyCode['KEY_Z'] = 56)] = 'KEY_Z';
    KeyCode[(KeyCode['Meta'] = 57)] = 'Meta';
    KeyCode[(KeyCode['ContextMenu'] = 58)] = 'ContextMenu';
    KeyCode[(KeyCode['F1'] = 59)] = 'F1';
    KeyCode[(KeyCode['F2'] = 60)] = 'F2';
    KeyCode[(KeyCode['F3'] = 61)] = 'F3';
    KeyCode[(KeyCode['F4'] = 62)] = 'F4';
    KeyCode[(KeyCode['F5'] = 63)] = 'F5';
    KeyCode[(KeyCode['F6'] = 64)] = 'F6';
    KeyCode[(KeyCode['F7'] = 65)] = 'F7';
    KeyCode[(KeyCode['F8'] = 66)] = 'F8';
    KeyCode[(KeyCode['F9'] = 67)] = 'F9';
    KeyCode[(KeyCode['F10'] = 68)] = 'F10';
    KeyCode[(KeyCode['F11'] = 69)] = 'F11';
    KeyCode[(KeyCode['F12'] = 70)] = 'F12';
    KeyCode[(KeyCode['F13'] = 71)] = 'F13';
    KeyCode[(KeyCode['F14'] = 72)] = 'F14';
    KeyCode[(KeyCode['F15'] = 73)] = 'F15';
    KeyCode[(KeyCode['F16'] = 74)] = 'F16';
    KeyCode[(KeyCode['F17'] = 75)] = 'F17';
    KeyCode[(KeyCode['F18'] = 76)] = 'F18';
    KeyCode[(KeyCode['F19'] = 77)] = 'F19';
    KeyCode[(KeyCode['NumLock'] = 78)] = 'NumLock';
    KeyCode[(KeyCode['ScrollLock'] = 79)] = 'ScrollLock';
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ';:' key
     */
    KeyCode[(KeyCode['US_SEMICOLON'] = 80)] = 'US_SEMICOLON';
    /**
     * For any country/region, the '+' key
     * For the US standard keyboard, the '=+' key
     */
    KeyCode[(KeyCode['US_EQUAL'] = 81)] = 'US_EQUAL';
    /**
     * For any country/region, the ',' key
     * For the US standard keyboard, the ',<' key
     */
    KeyCode[(KeyCode['US_COMMA'] = 82)] = 'US_COMMA';
    /**
     * For any country/region, the '-' key
     * For the US standard keyboard, the '-_' key
     */
    KeyCode[(KeyCode['US_MINUS'] = 83)] = 'US_MINUS';
    /**
     * For any country/region, the '.' key
     * For the US standard keyboard, the '.>' key
     */
    KeyCode[(KeyCode['US_DOT'] = 84)] = 'US_DOT';
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '/?' key
     */
    KeyCode[(KeyCode['US_SLASH'] = 85)] = 'US_SLASH';
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '`~' key
     */
    KeyCode[(KeyCode['US_BACKTICK'] = 86)] = 'US_BACKTICK';
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '[{' key
     */
    KeyCode[(KeyCode['US_OPEN_SQUARE_BRACKET'] = 87)] = 'US_OPEN_SQUARE_BRACKET';
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the '\|' key
     */
    KeyCode[(KeyCode['US_BACKSLASH'] = 88)] = 'US_BACKSLASH';
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ']}' key
     */
    KeyCode[(KeyCode['US_CLOSE_SQUARE_BRACKET'] = 89)] = 'US_CLOSE_SQUARE_BRACKET';
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     * For the US standard keyboard, the ''"' key
     */
    KeyCode[(KeyCode['US_QUOTE'] = 90)] = 'US_QUOTE';
    /**
     * Used for miscellaneous characters; it can vary by keyboard.
     */
    KeyCode[(KeyCode['OEM_8'] = 91)] = 'OEM_8';
    /**
     * Either the angle bracket key or the backslash key on the RT 102-key keyboard.
     */
    KeyCode[(KeyCode['OEM_102'] = 92)] = 'OEM_102';
    KeyCode[(KeyCode['NUMPAD_0'] = 93)] = 'NUMPAD_0';
    KeyCode[(KeyCode['NUMPAD_1'] = 94)] = 'NUMPAD_1';
    KeyCode[(KeyCode['NUMPAD_2'] = 95)] = 'NUMPAD_2';
    KeyCode[(KeyCode['NUMPAD_3'] = 96)] = 'NUMPAD_3';
    KeyCode[(KeyCode['NUMPAD_4'] = 97)] = 'NUMPAD_4';
    KeyCode[(KeyCode['NUMPAD_5'] = 98)] = 'NUMPAD_5';
    KeyCode[(KeyCode['NUMPAD_6'] = 99)] = 'NUMPAD_6';
    KeyCode[(KeyCode['NUMPAD_7'] = 100)] = 'NUMPAD_7';
    KeyCode[(KeyCode['NUMPAD_8'] = 101)] = 'NUMPAD_8';
    KeyCode[(KeyCode['NUMPAD_9'] = 102)] = 'NUMPAD_9';
    KeyCode[(KeyCode['NUMPAD_MULTIPLY'] = 103)] = 'NUMPAD_MULTIPLY';
    KeyCode[(KeyCode['NUMPAD_ADD'] = 104)] = 'NUMPAD_ADD';
    KeyCode[(KeyCode['NUMPAD_SEPARATOR'] = 105)] = 'NUMPAD_SEPARATOR';
    KeyCode[(KeyCode['NUMPAD_SUBTRACT'] = 106)] = 'NUMPAD_SUBTRACT';
    KeyCode[(KeyCode['NUMPAD_DECIMAL'] = 107)] = 'NUMPAD_DECIMAL';
    KeyCode[(KeyCode['NUMPAD_DIVIDE'] = 108)] = 'NUMPAD_DIVIDE';
    /**
     * Cover all key codes when IME is processing input.
     */
    KeyCode[(KeyCode['KEY_IN_COMPOSITION'] = 109)] = 'KEY_IN_COMPOSITION';
    KeyCode[(KeyCode['ABNT_C1'] = 110)] = 'ABNT_C1';
    KeyCode[(KeyCode['ABNT_C2'] = 111)] = 'ABNT_C2';
    /**
     * Placed last to cover the length of the enum.
     * Please do not depend on this value!
     */
    KeyCode[(KeyCode['MAX_VALUE'] = 112)] = 'MAX_VALUE';
  })(KeyCode || (KeyCode = {}));
  /**
   * The direction of a selection.
   */
  var SelectionDirection;
  (function(SelectionDirection) {
    /**
     * The selection starts above where it ends.
     */
    SelectionDirection[(SelectionDirection['LTR'] = 0)] = 'LTR';
    /**
     * The selection starts below where it ends.
     */
    SelectionDirection[(SelectionDirection['RTL'] = 1)] = 'RTL';
  })(SelectionDirection || (SelectionDirection = {}));
  var ScrollbarVisibility;
  (function(ScrollbarVisibility) {
    ScrollbarVisibility[(ScrollbarVisibility['Auto'] = 1)] = 'Auto';
    ScrollbarVisibility[(ScrollbarVisibility['Hidden'] = 2)] = 'Hidden';
    ScrollbarVisibility[(ScrollbarVisibility['Visible'] = 3)] = 'Visible';
  })(ScrollbarVisibility || (ScrollbarVisibility = {}));
  /**
   * Vertical Lane in the overview ruler of the editor.
   */
  var OverviewRulerLane;
  (function(OverviewRulerLane) {
    OverviewRulerLane[(OverviewRulerLane['Left'] = 1)] = 'Left';
    OverviewRulerLane[(OverviewRulerLane['Center'] = 2)] = 'Center';
    OverviewRulerLane[(OverviewRulerLane['Right'] = 4)] = 'Right';
    OverviewRulerLane[(OverviewRulerLane['Full'] = 7)] = 'Full';
  })(OverviewRulerLane || (OverviewRulerLane = {}));
  /**
   * End of line character preference.
   */
  var EndOfLinePreference;
  (function(EndOfLinePreference) {
    /**
     * Use the end of line character identified in the text buffer.
     */
    EndOfLinePreference[(EndOfLinePreference['TextDefined'] = 0)] = 'TextDefined';
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLinePreference[(EndOfLinePreference['LF'] = 1)] = 'LF';
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLinePreference[(EndOfLinePreference['CRLF'] = 2)] = 'CRLF';
  })(EndOfLinePreference || (EndOfLinePreference = {}));
  /**
   * The default end of line to use when instantiating models.
   */
  var DefaultEndOfLine;
  (function(DefaultEndOfLine) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    DefaultEndOfLine[(DefaultEndOfLine['LF'] = 1)] = 'LF';
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    DefaultEndOfLine[(DefaultEndOfLine['CRLF'] = 2)] = 'CRLF';
  })(DefaultEndOfLine || (DefaultEndOfLine = {}));
  /**
   * End of line character preference.
   */
  var EndOfLineSequence;
  (function(EndOfLineSequence) {
    /**
     * Use line feed (\n) as the end of line character.
     */
    EndOfLineSequence[(EndOfLineSequence['LF'] = 0)] = 'LF';
    /**
     * Use carriage return and line feed (\r\n) as the end of line character.
     */
    EndOfLineSequence[(EndOfLineSequence['CRLF'] = 1)] = 'CRLF';
  })(EndOfLineSequence || (EndOfLineSequence = {}));
  /**
   * Describes the behavior of decorations when typing/editing near their edges.
   * Note: Please do not edit the values, as they very carefully match `DecorationRangeBehavior`
   */
  var TrackedRangeStickiness;
  (function(TrackedRangeStickiness) {
    TrackedRangeStickiness[(TrackedRangeStickiness['AlwaysGrowsWhenTypingAtEdges'] = 0)] =
      'AlwaysGrowsWhenTypingAtEdges';
    TrackedRangeStickiness[(TrackedRangeStickiness['NeverGrowsWhenTypingAtEdges'] = 1)] =
      'NeverGrowsWhenTypingAtEdges';
    TrackedRangeStickiness[(TrackedRangeStickiness['GrowsOnlyWhenTypingBefore'] = 2)] =
      'GrowsOnlyWhenTypingBefore';
    TrackedRangeStickiness[(TrackedRangeStickiness['GrowsOnlyWhenTypingAfter'] = 3)] =
      'GrowsOnlyWhenTypingAfter';
  })(TrackedRangeStickiness || (TrackedRangeStickiness = {}));
  var ScrollType;
  (function(ScrollType) {
    ScrollType[(ScrollType['Smooth'] = 0)] = 'Smooth';
    ScrollType[(ScrollType['Immediate'] = 1)] = 'Immediate';
  })(ScrollType || (ScrollType = {}));
  /**
   * Describes the reason the cursor has changed its position.
   */
  var CursorChangeReason;
  (function(CursorChangeReason) {
    /**
     * Unknown or not set.
     */
    CursorChangeReason[(CursorChangeReason['NotSet'] = 0)] = 'NotSet';
    /**
     * A `model.setValue()` was called.
     */
    CursorChangeReason[(CursorChangeReason['ContentFlush'] = 1)] = 'ContentFlush';
    /**
     * The `model` has been changed outside of this cursor and the cursor recovers its position from associated markers.
     */
    CursorChangeReason[(CursorChangeReason['RecoverFromMarkers'] = 2)] = 'RecoverFromMarkers';
    /**
     * There was an explicit user gesture.
     */
    CursorChangeReason[(CursorChangeReason['Explicit'] = 3)] = 'Explicit';
    /**
     * There was a Paste.
     */
    CursorChangeReason[(CursorChangeReason['Paste'] = 4)] = 'Paste';
    /**
     * There was an Undo.
     */
    CursorChangeReason[(CursorChangeReason['Undo'] = 5)] = 'Undo';
    /**
     * There was a Redo.
     */
    CursorChangeReason[(CursorChangeReason['Redo'] = 6)] = 'Redo';
  })(CursorChangeReason || (CursorChangeReason = {}));
  var RenderMinimap;
  (function(RenderMinimap) {
    RenderMinimap[(RenderMinimap['None'] = 0)] = 'None';
    RenderMinimap[(RenderMinimap['Small'] = 1)] = 'Small';
    RenderMinimap[(RenderMinimap['Large'] = 2)] = 'Large';
    RenderMinimap[(RenderMinimap['SmallBlocks'] = 3)] = 'SmallBlocks';
    RenderMinimap[(RenderMinimap['LargeBlocks'] = 4)] = 'LargeBlocks';
  })(RenderMinimap || (RenderMinimap = {}));
  /**
   * Describes how to indent wrapped lines.
   */
  var WrappingIndent;
  (function(WrappingIndent) {
    /**
     * No indentation => wrapped lines begin at column 1.
     */
    WrappingIndent[(WrappingIndent['None'] = 0)] = 'None';
    /**
     * Same => wrapped lines get the same indentation as the parent.
     */
    WrappingIndent[(WrappingIndent['Same'] = 1)] = 'Same';
    /**
     * Indent => wrapped lines get +1 indentation toward the parent.
     */
    WrappingIndent[(WrappingIndent['Indent'] = 2)] = 'Indent';
    /**
     * DeepIndent => wrapped lines get +2 indentation toward the parent.
     */
    WrappingIndent[(WrappingIndent['DeepIndent'] = 3)] = 'DeepIndent';
  })(WrappingIndent || (WrappingIndent = {}));
  /**
   * The kind of animation in which the editor's cursor should be rendered.
   */
  var TextEditorCursorBlinkingStyle;
  (function(TextEditorCursorBlinkingStyle) {
    /**
     * Hidden
     */
    TextEditorCursorBlinkingStyle[(TextEditorCursorBlinkingStyle['Hidden'] = 0)] = 'Hidden';
    /**
     * Blinking
     */
    TextEditorCursorBlinkingStyle[(TextEditorCursorBlinkingStyle['Blink'] = 1)] = 'Blink';
    /**
     * Blinking with smooth fading
     */
    TextEditorCursorBlinkingStyle[(TextEditorCursorBlinkingStyle['Smooth'] = 2)] = 'Smooth';
    /**
     * Blinking with prolonged filled state and smooth fading
     */
    TextEditorCursorBlinkingStyle[(TextEditorCursorBlinkingStyle['Phase'] = 3)] = 'Phase';
    /**
     * Expand collapse animation on the y axis
     */
    TextEditorCursorBlinkingStyle[(TextEditorCursorBlinkingStyle['Expand'] = 4)] = 'Expand';
    /**
     * No-Blinking
     */
    TextEditorCursorBlinkingStyle[(TextEditorCursorBlinkingStyle['Solid'] = 5)] = 'Solid';
  })(TextEditorCursorBlinkingStyle || (TextEditorCursorBlinkingStyle = {}));
  /**
   * The style in which the editor's cursor should be rendered.
   */
  var TextEditorCursorStyle;
  (function(TextEditorCursorStyle) {
    /**
     * As a vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[(TextEditorCursorStyle['Line'] = 1)] = 'Line';
    /**
     * As a block (sitting on top of a character).
     */
    TextEditorCursorStyle[(TextEditorCursorStyle['Block'] = 2)] = 'Block';
    /**
     * As a horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[(TextEditorCursorStyle['Underline'] = 3)] = 'Underline';
    /**
     * As a thin vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[(TextEditorCursorStyle['LineThin'] = 4)] = 'LineThin';
    /**
     * As an outlined block (sitting on top of a character).
     */
    TextEditorCursorStyle[(TextEditorCursorStyle['BlockOutline'] = 5)] = 'BlockOutline';
    /**
     * As a thin horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[(TextEditorCursorStyle['UnderlineThin'] = 6)] = 'UnderlineThin';
  })(TextEditorCursorStyle || (TextEditorCursorStyle = {}));
  var RenderLineNumbersType;
  (function(RenderLineNumbersType) {
    RenderLineNumbersType[(RenderLineNumbersType['Off'] = 0)] = 'Off';
    RenderLineNumbersType[(RenderLineNumbersType['On'] = 1)] = 'On';
    RenderLineNumbersType[(RenderLineNumbersType['Relative'] = 2)] = 'Relative';
    RenderLineNumbersType[(RenderLineNumbersType['Interval'] = 3)] = 'Interval';
    RenderLineNumbersType[(RenderLineNumbersType['Custom'] = 4)] = 'Custom';
  })(RenderLineNumbersType || (RenderLineNumbersType = {}));
  /**
   * A positioning preference for rendering content widgets.
   */
  var ContentWidgetPositionPreference;
  (function(ContentWidgetPositionPreference) {
    /**
     * Place the content widget exactly at a position
     */
    ContentWidgetPositionPreference[(ContentWidgetPositionPreference['EXACT'] = 0)] = 'EXACT';
    /**
     * Place the content widget above a position
     */
    ContentWidgetPositionPreference[(ContentWidgetPositionPreference['ABOVE'] = 1)] = 'ABOVE';
    /**
     * Place the content widget below a position
     */
    ContentWidgetPositionPreference[(ContentWidgetPositionPreference['BELOW'] = 2)] = 'BELOW';
  })(ContentWidgetPositionPreference || (ContentWidgetPositionPreference = {}));
  /**
   * A positioning preference for rendering overlay widgets.
   */
  var OverlayWidgetPositionPreference;
  (function(OverlayWidgetPositionPreference) {
    /**
     * Position the overlay widget in the top right corner
     */
    OverlayWidgetPositionPreference[(OverlayWidgetPositionPreference['TOP_RIGHT_CORNER'] = 0)] =
      'TOP_RIGHT_CORNER';
    /**
     * Position the overlay widget in the bottom right corner
     */
    OverlayWidgetPositionPreference[(OverlayWidgetPositionPreference['BOTTOM_RIGHT_CORNER'] = 1)] =
      'BOTTOM_RIGHT_CORNER';
    /**
     * Position the overlay widget in the top center
     */
    OverlayWidgetPositionPreference[(OverlayWidgetPositionPreference['TOP_CENTER'] = 2)] =
      'TOP_CENTER';
  })(OverlayWidgetPositionPreference || (OverlayWidgetPositionPreference = {}));
  /**
   * Type of hit element with the mouse in the editor.
   */
  var MouseTargetType;
  (function(MouseTargetType) {
    /**
     * Mouse is on top of an unknown element.
     */
    MouseTargetType[(MouseTargetType['UNKNOWN'] = 0)] = 'UNKNOWN';
    /**
     * Mouse is on top of the textarea used for input.
     */
    MouseTargetType[(MouseTargetType['TEXTAREA'] = 1)] = 'TEXTAREA';
    /**
     * Mouse is on top of the glyph margin
     */
    MouseTargetType[(MouseTargetType['GUTTER_GLYPH_MARGIN'] = 2)] = 'GUTTER_GLYPH_MARGIN';
    /**
     * Mouse is on top of the line numbers
     */
    MouseTargetType[(MouseTargetType['GUTTER_LINE_NUMBERS'] = 3)] = 'GUTTER_LINE_NUMBERS';
    /**
     * Mouse is on top of the line decorations
     */
    MouseTargetType[(MouseTargetType['GUTTER_LINE_DECORATIONS'] = 4)] = 'GUTTER_LINE_DECORATIONS';
    /**
     * Mouse is on top of the whitespace left in the gutter by a view zone.
     */
    MouseTargetType[(MouseTargetType['GUTTER_VIEW_ZONE'] = 5)] = 'GUTTER_VIEW_ZONE';
    /**
     * Mouse is on top of text in the content.
     */
    MouseTargetType[(MouseTargetType['CONTENT_TEXT'] = 6)] = 'CONTENT_TEXT';
    /**
     * Mouse is on top of empty space in the content (e.g. after line text or below last line)
     */
    MouseTargetType[(MouseTargetType['CONTENT_EMPTY'] = 7)] = 'CONTENT_EMPTY';
    /**
     * Mouse is on top of a view zone in the content.
     */
    MouseTargetType[(MouseTargetType['CONTENT_VIEW_ZONE'] = 8)] = 'CONTENT_VIEW_ZONE';
    /**
     * Mouse is on top of a content widget.
     */
    MouseTargetType[(MouseTargetType['CONTENT_WIDGET'] = 9)] = 'CONTENT_WIDGET';
    /**
     * Mouse is on top of the decorations overview ruler.
     */
    MouseTargetType[(MouseTargetType['OVERVIEW_RULER'] = 10)] = 'OVERVIEW_RULER';
    /**
     * Mouse is on top of a scrollbar.
     */
    MouseTargetType[(MouseTargetType['SCROLLBAR'] = 11)] = 'SCROLLBAR';
    /**
     * Mouse is on top of an overlay widget.
     */
    MouseTargetType[(MouseTargetType['OVERLAY_WIDGET'] = 12)] = 'OVERLAY_WIDGET';
    /**
     * Mouse is outside of the editor.
     */
    MouseTargetType[(MouseTargetType['OUTSIDE_EDITOR'] = 13)] = 'OUTSIDE_EDITOR';
  })(MouseTargetType || (MouseTargetType = {}));
  /**
   * Describes what to do with the indentation when pressing Enter.
   */
  var IndentAction;
  (function(IndentAction) {
    /**
     * Insert new line and copy the previous line's indentation.
     */
    IndentAction[(IndentAction['None'] = 0)] = 'None';
    /**
     * Insert new line and indent once (relative to the previous line's indentation).
     */
    IndentAction[(IndentAction['Indent'] = 1)] = 'Indent';
    /**
     * Insert two new lines:
     *  - the first one indented which will hold the cursor
     *  - the second one at the same indentation level
     */
    IndentAction[(IndentAction['IndentOutdent'] = 2)] = 'IndentOutdent';
    /**
     * Insert new line and outdent once (relative to the previous line's indentation).
     */
    IndentAction[(IndentAction['Outdent'] = 3)] = 'Outdent';
  })(IndentAction || (IndentAction = {}));
  var CompletionItemKind;
  (function(CompletionItemKind) {
    CompletionItemKind[(CompletionItemKind['Method'] = 0)] = 'Method';
    CompletionItemKind[(CompletionItemKind['Function'] = 1)] = 'Function';
    CompletionItemKind[(CompletionItemKind['Constructor'] = 2)] = 'Constructor';
    CompletionItemKind[(CompletionItemKind['Field'] = 3)] = 'Field';
    CompletionItemKind[(CompletionItemKind['Variable'] = 4)] = 'Variable';
    CompletionItemKind[(CompletionItemKind['Class'] = 5)] = 'Class';
    CompletionItemKind[(CompletionItemKind['Struct'] = 6)] = 'Struct';
    CompletionItemKind[(CompletionItemKind['Interface'] = 7)] = 'Interface';
    CompletionItemKind[(CompletionItemKind['Module'] = 8)] = 'Module';
    CompletionItemKind[(CompletionItemKind['Property'] = 9)] = 'Property';
    CompletionItemKind[(CompletionItemKind['Event'] = 10)] = 'Event';
    CompletionItemKind[(CompletionItemKind['Operator'] = 11)] = 'Operator';
    CompletionItemKind[(CompletionItemKind['Unit'] = 12)] = 'Unit';
    CompletionItemKind[(CompletionItemKind['Value'] = 13)] = 'Value';
    CompletionItemKind[(CompletionItemKind['Constant'] = 14)] = 'Constant';
    CompletionItemKind[(CompletionItemKind['Enum'] = 15)] = 'Enum';
    CompletionItemKind[(CompletionItemKind['EnumMember'] = 16)] = 'EnumMember';
    CompletionItemKind[(CompletionItemKind['Keyword'] = 17)] = 'Keyword';
    CompletionItemKind[(CompletionItemKind['Text'] = 18)] = 'Text';
    CompletionItemKind[(CompletionItemKind['Color'] = 19)] = 'Color';
    CompletionItemKind[(CompletionItemKind['File'] = 20)] = 'File';
    CompletionItemKind[(CompletionItemKind['Reference'] = 21)] = 'Reference';
    CompletionItemKind[(CompletionItemKind['Customcolor'] = 22)] = 'Customcolor';
    CompletionItemKind[(CompletionItemKind['Folder'] = 23)] = 'Folder';
    CompletionItemKind[(CompletionItemKind['TypeParameter'] = 24)] = 'TypeParameter';
    CompletionItemKind[(CompletionItemKind['Snippet'] = 25)] = 'Snippet';
  })(CompletionItemKind || (CompletionItemKind = {}));
  var CompletionItemInsertTextRule;
  (function(CompletionItemInsertTextRule) {
    /**
     * Adjust whitespace/indentation of multiline insert texts to
     * match the current line indentation.
     */
    CompletionItemInsertTextRule[(CompletionItemInsertTextRule['KeepWhitespace'] = 1)] =
      'KeepWhitespace';
    /**
     * `insertText` is a snippet.
     */
    CompletionItemInsertTextRule[(CompletionItemInsertTextRule['InsertAsSnippet'] = 4)] =
      'InsertAsSnippet';
  })(CompletionItemInsertTextRule || (CompletionItemInsertTextRule = {}));
  /**
   * How a suggest provider was triggered.
   */
  var CompletionTriggerKind;
  (function(CompletionTriggerKind) {
    CompletionTriggerKind[(CompletionTriggerKind['Invoke'] = 0)] = 'Invoke';
    CompletionTriggerKind[(CompletionTriggerKind['TriggerCharacter'] = 1)] = 'TriggerCharacter';
    CompletionTriggerKind[(CompletionTriggerKind['TriggerForIncompleteCompletions'] = 2)] =
      'TriggerForIncompleteCompletions';
  })(CompletionTriggerKind || (CompletionTriggerKind = {}));
  var SignatureHelpTriggerKind;
  (function(SignatureHelpTriggerKind) {
    SignatureHelpTriggerKind[(SignatureHelpTriggerKind['Invoke'] = 1)] = 'Invoke';
    SignatureHelpTriggerKind[(SignatureHelpTriggerKind['TriggerCharacter'] = 2)] =
      'TriggerCharacter';
    SignatureHelpTriggerKind[(SignatureHelpTriggerKind['ContentChange'] = 3)] = 'ContentChange';
  })(SignatureHelpTriggerKind || (SignatureHelpTriggerKind = {}));
  /**
   * A document highlight kind.
   */
  var DocumentHighlightKind;
  (function(DocumentHighlightKind) {
    /**
     * A textual occurrence.
     */
    DocumentHighlightKind[(DocumentHighlightKind['Text'] = 0)] = 'Text';
    /**
     * Read-access of a symbol, like reading a variable.
     */
    DocumentHighlightKind[(DocumentHighlightKind['Read'] = 1)] = 'Read';
    /**
     * Write-access of a symbol, like writing to a variable.
     */
    DocumentHighlightKind[(DocumentHighlightKind['Write'] = 2)] = 'Write';
  })(DocumentHighlightKind || (DocumentHighlightKind = {}));
  /**
   * A symbol kind.
   */
  var SymbolKind;
  (function(SymbolKind) {
    SymbolKind[(SymbolKind['File'] = 0)] = 'File';
    SymbolKind[(SymbolKind['Module'] = 1)] = 'Module';
    SymbolKind[(SymbolKind['Namespace'] = 2)] = 'Namespace';
    SymbolKind[(SymbolKind['Package'] = 3)] = 'Package';
    SymbolKind[(SymbolKind['Class'] = 4)] = 'Class';
    SymbolKind[(SymbolKind['Method'] = 5)] = 'Method';
    SymbolKind[(SymbolKind['Property'] = 6)] = 'Property';
    SymbolKind[(SymbolKind['Field'] = 7)] = 'Field';
    SymbolKind[(SymbolKind['Constructor'] = 8)] = 'Constructor';
    SymbolKind[(SymbolKind['Enum'] = 9)] = 'Enum';
    SymbolKind[(SymbolKind['Interface'] = 10)] = 'Interface';
    SymbolKind[(SymbolKind['Function'] = 11)] = 'Function';
    SymbolKind[(SymbolKind['Variable'] = 12)] = 'Variable';
    SymbolKind[(SymbolKind['Constant'] = 13)] = 'Constant';
    SymbolKind[(SymbolKind['String'] = 14)] = 'String';
    SymbolKind[(SymbolKind['Number'] = 15)] = 'Number';
    SymbolKind[(SymbolKind['Boolean'] = 16)] = 'Boolean';
    SymbolKind[(SymbolKind['Array'] = 17)] = 'Array';
    SymbolKind[(SymbolKind['Object'] = 18)] = 'Object';
    SymbolKind[(SymbolKind['Key'] = 19)] = 'Key';
    SymbolKind[(SymbolKind['Null'] = 20)] = 'Null';
    SymbolKind[(SymbolKind['EnumMember'] = 21)] = 'EnumMember';
    SymbolKind[(SymbolKind['Struct'] = 22)] = 'Struct';
    SymbolKind[(SymbolKind['Event'] = 23)] = 'Event';
    SymbolKind[(SymbolKind['Operator'] = 24)] = 'Operator';
    SymbolKind[(SymbolKind['TypeParameter'] = 25)] = 'TypeParameter';
  })(SymbolKind || (SymbolKind = {}));

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var KeyMod = /** @class */ (function() {
    function KeyMod() {}
    KeyMod.chord = function(firstPart, secondPart) {
      return KeyChord(firstPart, secondPart);
    };
    KeyMod.CtrlCmd = 2048 /* CtrlCmd */;
    KeyMod.Shift = 1024 /* Shift */;
    KeyMod.Alt = 512 /* Alt */;
    KeyMod.WinCtrl = 256 /* WinCtrl */;
    return KeyMod;
  })();
  function createMonacoBaseAPI() {
    return {
      editor: undefined,
      languages: undefined,
      CancellationTokenSource: CancellationTokenSource,
      Emitter: Emitter,
      KeyCode: KeyCode,
      KeyMod: KeyMod,
      Position: Position,
      Range: Range,
      Selection: Selection,
      SelectionDirection: SelectionDirection,
      MarkerSeverity: MarkerSeverity,
      MarkerTag: MarkerTag,
      Uri: URI,
      Token: Token,
    };
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var __extends$5 =
    (undefined && undefined.__extends) ||
    (function() {
      var extendStatics = function(d, b) {
        extendStatics =
          Object.setPrototypeOf ||
          ({ __proto__: [] } instanceof Array &&
            function(d, b) {
              d.__proto__ = b;
            }) ||
          function(d, b) {
            for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
          };
        return extendStatics(d, b);
      };
      return function(d, b) {
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
      };
    })();
  /**
   * @internal
   */
  var MirrorModel = /** @class */ (function(_super) {
    __extends$5(MirrorModel, _super);
    function MirrorModel() {
      return (_super !== null && _super.apply(this, arguments)) || this;
    }
    Object.defineProperty(MirrorModel.prototype, 'uri', {
      get: function() {
        return this._uri;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(MirrorModel.prototype, 'version', {
      get: function() {
        return this._versionId;
      },
      enumerable: true,
      configurable: true,
    });
    Object.defineProperty(MirrorModel.prototype, 'eol', {
      get: function() {
        return this._eol;
      },
      enumerable: true,
      configurable: true,
    });
    MirrorModel.prototype.getValue = function() {
      return this.getText();
    };
    MirrorModel.prototype.getLinesContent = function() {
      return this._lines.slice(0);
    };
    MirrorModel.prototype.getLineCount = function() {
      return this._lines.length;
    };
    MirrorModel.prototype.getLineContent = function(lineNumber) {
      return this._lines[lineNumber - 1];
    };
    MirrorModel.prototype.getWordAtPosition = function(position, wordDefinition) {
      var wordAtText = getWordAtText(
        position.column,
        ensureValidWordDefinition(wordDefinition),
        this._lines[position.lineNumber - 1],
        0
      );
      if (wordAtText) {
        return new Range(
          position.lineNumber,
          wordAtText.startColumn,
          position.lineNumber,
          wordAtText.endColumn
        );
      }
      return null;
    };
    MirrorModel.prototype.getWordUntilPosition = function(position, wordDefinition) {
      var wordAtPosition = this.getWordAtPosition(position, wordDefinition);
      if (!wordAtPosition) {
        return {
          word: '',
          startColumn: position.column,
          endColumn: position.column,
        };
      }
      return {
        word: this._lines[position.lineNumber - 1].substring(
          wordAtPosition.startColumn - 1,
          position.column - 1
        ),
        startColumn: wordAtPosition.startColumn,
        endColumn: position.column,
      };
    };
    MirrorModel.prototype.createWordIterator = function(wordDefinition) {
      var _this = this;
      var obj;
      var lineNumber = 0;
      var lineText;
      var wordRangesIdx = 0;
      var wordRanges = [];
      var next = function() {
        if (wordRangesIdx < wordRanges.length) {
          var value = lineText.substring(
            wordRanges[wordRangesIdx].start,
            wordRanges[wordRangesIdx].end
          );
          wordRangesIdx += 1;
          if (!obj) {
            obj = { done: false, value: value };
          } else {
            obj.value = value;
          }
          return obj;
        } else if (lineNumber >= _this._lines.length) {
          return FIN;
        } else {
          lineText = _this._lines[lineNumber];
          wordRanges = _this._wordenize(lineText, wordDefinition);
          wordRangesIdx = 0;
          lineNumber += 1;
          return next();
        }
      };
      return { next: next };
    };
    MirrorModel.prototype.getLineWords = function(lineNumber, wordDefinition) {
      var content = this._lines[lineNumber - 1];
      var ranges = this._wordenize(content, wordDefinition);
      var words = [];
      for (var _i = 0, ranges_1 = ranges; _i < ranges_1.length; _i++) {
        var range = ranges_1[_i];
        words.push({
          word: content.substring(range.start, range.end),
          startColumn: range.start + 1,
          endColumn: range.end + 1,
        });
      }
      return words;
    };
    MirrorModel.prototype._wordenize = function(content, wordDefinition) {
      var result = [];
      var match;
      wordDefinition.lastIndex = 0; // reset lastIndex just to be sure
      while ((match = wordDefinition.exec(content))) {
        if (match[0].length === 0) {
          // it did match the empty string
          break;
        }
        result.push({ start: match.index, end: match.index + match[0].length });
      }
      return result;
    };
    MirrorModel.prototype.getValueInRange = function(range) {
      range = this._validateRange(range);
      if (range.startLineNumber === range.endLineNumber) {
        return this._lines[range.startLineNumber - 1].substring(
          range.startColumn - 1,
          range.endColumn - 1
        );
      }
      var lineEnding = this._eol;
      var startLineIndex = range.startLineNumber - 1;
      var endLineIndex = range.endLineNumber - 1;
      var resultLines = [];
      resultLines.push(this._lines[startLineIndex].substring(range.startColumn - 1));
      for (var i = startLineIndex + 1; i < endLineIndex; i++) {
        resultLines.push(this._lines[i]);
      }
      resultLines.push(this._lines[endLineIndex].substring(0, range.endColumn - 1));
      return resultLines.join(lineEnding);
    };
    MirrorModel.prototype.offsetAt = function(position) {
      position = this._validatePosition(position);
      this._ensureLineStarts();
      return this._lineStarts.getAccumulatedValue(position.lineNumber - 2) + (position.column - 1);
    };
    MirrorModel.prototype.positionAt = function(offset) {
      offset = Math.floor(offset);
      offset = Math.max(0, offset);
      this._ensureLineStarts();
      var out = this._lineStarts.getIndexOf(offset);
      var lineLength = this._lines[out.index].length;
      // Ensure we return a valid position
      return {
        lineNumber: 1 + out.index,
        column: 1 + Math.min(out.remainder, lineLength),
      };
    };
    MirrorModel.prototype._validateRange = function(range) {
      var start = this._validatePosition({
        lineNumber: range.startLineNumber,
        column: range.startColumn,
      });
      var end = this._validatePosition({
        lineNumber: range.endLineNumber,
        column: range.endColumn,
      });
      if (
        start.lineNumber !== range.startLineNumber ||
        start.column !== range.startColumn ||
        end.lineNumber !== range.endLineNumber ||
        end.column !== range.endColumn
      ) {
        return {
          startLineNumber: start.lineNumber,
          startColumn: start.column,
          endLineNumber: end.lineNumber,
          endColumn: end.column,
        };
      }
      return range;
    };
    MirrorModel.prototype._validatePosition = function(position) {
      if (!Position.isIPosition(position)) {
        throw new Error('bad position');
      }
      var lineNumber = position.lineNumber,
        column = position.column;
      var hasChanged = false;
      if (lineNumber < 1) {
        lineNumber = 1;
        column = 1;
        hasChanged = true;
      } else if (lineNumber > this._lines.length) {
        lineNumber = this._lines.length;
        column = this._lines[lineNumber - 1].length + 1;
        hasChanged = true;
      } else {
        var maxCharacter = this._lines[lineNumber - 1].length + 1;
        if (column < 1) {
          column = 1;
          hasChanged = true;
        } else if (column > maxCharacter) {
          column = maxCharacter;
          hasChanged = true;
        }
      }
      if (!hasChanged) {
        return position;
      } else {
        return { lineNumber: lineNumber, column: column };
      }
    };
    return MirrorModel;
  })(MirrorTextModel);
  /**
   * @internal
   */
  var BaseEditorSimpleWorker = /** @class */ (function() {
    function BaseEditorSimpleWorker(foreignModuleFactory) {
      this._foreignModuleFactory = foreignModuleFactory;
      this._foreignModule = null;
    }
    // ---- BEGIN diff --------------------------------------------------------------------------
    BaseEditorSimpleWorker.prototype.computeDiff = function(
      originalUrl,
      modifiedUrl,
      ignoreTrimWhitespace
    ) {
      var original = this._getModel(originalUrl);
      var modified = this._getModel(modifiedUrl);
      if (!original || !modified) {
        return Promise.resolve(null);
      }
      var originalLines = original.getLinesContent();
      var modifiedLines = modified.getLinesContent();
      var diffComputer = new DiffComputer(originalLines, modifiedLines, {
        shouldComputeCharChanges: true,
        shouldPostProcessCharChanges: true,
        shouldIgnoreTrimWhitespace: ignoreTrimWhitespace,
        shouldMakePrettyDiff: true,
      });
      var changes = diffComputer.computeDiff();
      var identical = changes.length > 0 ? false : this._modelsAreIdentical(original, modified);
      return Promise.resolve({
        identical: identical,
        changes: changes,
      });
    };
    BaseEditorSimpleWorker.prototype._modelsAreIdentical = function(original, modified) {
      var originalLineCount = original.getLineCount();
      var modifiedLineCount = modified.getLineCount();
      if (originalLineCount !== modifiedLineCount) {
        return false;
      }
      for (var line = 1; line <= originalLineCount; line++) {
        var originalLine = original.getLineContent(line);
        var modifiedLine = modified.getLineContent(line);
        if (originalLine !== modifiedLine) {
          return false;
        }
      }
      return true;
    };
    BaseEditorSimpleWorker.prototype.computeMoreMinimalEdits = function(modelUrl, edits) {
      var model = this._getModel(modelUrl);
      if (!model) {
        return Promise.resolve(edits);
      }
      var result = [];
      var lastEol = undefined;
      edits = mergeSort(edits, function(a, b) {
        if (a.range && b.range) {
          return Range.compareRangesUsingStarts(a.range, b.range);
        }
        // eol only changes should go to the end
        var aRng = a.range ? 0 : 1;
        var bRng = b.range ? 0 : 1;
        return aRng - bRng;
      });
      for (var _i = 0, edits_1 = edits; _i < edits_1.length; _i++) {
        var _a = edits_1[_i],
          range = _a.range,
          text = _a.text,
          eol = _a.eol;
        if (typeof eol === 'number') {
          lastEol = eol;
        }
        if (Range.isEmpty(range) && !text) {
          // empty change
          continue;
        }
        var original = model.getValueInRange(range);
        text = text.replace(/\r\n|\n|\r/g, model.eol);
        if (original === text) {
          // noop
          continue;
        }
        // make sure diff won't take too long
        if (Math.max(text.length, original.length) > BaseEditorSimpleWorker._diffLimit) {
          result.push({ range: range, text: text });
          continue;
        }
        // compute diff between original and edit.text
        var changes = stringDiff(original, text, false);
        var editOffset = model.offsetAt(Range.lift(range).getStartPosition());
        for (var _b = 0, changes_1 = changes; _b < changes_1.length; _b++) {
          var change = changes_1[_b];
          var start = model.positionAt(editOffset + change.originalStart);
          var end = model.positionAt(editOffset + change.originalStart + change.originalLength);
          var newEdit = {
            text: text.substr(change.modifiedStart, change.modifiedLength),
            range: {
              startLineNumber: start.lineNumber,
              startColumn: start.column,
              endLineNumber: end.lineNumber,
              endColumn: end.column,
            },
          };
          if (model.getValueInRange(newEdit.range) !== newEdit.text) {
            result.push(newEdit);
          }
        }
      }
      if (typeof lastEol === 'number') {
        result.push({
          eol: lastEol,
          text: '',
          range: { startLineNumber: 0, startColumn: 0, endLineNumber: 0, endColumn: 0 },
        });
      }
      return Promise.resolve(result);
    };
    // ---- END minimal edits ---------------------------------------------------------------
    BaseEditorSimpleWorker.prototype.computeLinks = function(modelUrl) {
      var model = this._getModel(modelUrl);
      if (!model) {
        return Promise.resolve(null);
      }
      return Promise.resolve(computeLinks(model));
    };
    BaseEditorSimpleWorker.prototype.textualSuggest = function(
      modelUrl,
      position,
      wordDef,
      wordDefFlags
    ) {
      var model = this._getModel(modelUrl);
      if (!model) {
        return Promise.resolve(null);
      }
      var seen = Object.create(null);
      var suggestions = [];
      var wordDefRegExp = new RegExp(wordDef, wordDefFlags);
      var wordUntil = model.getWordUntilPosition(position, wordDefRegExp);
      var wordAt = model.getWordAtPosition(position, wordDefRegExp);
      if (wordAt) {
        seen[model.getValueInRange(wordAt)] = true;
      }
      for (
        var iter = model.createWordIterator(wordDefRegExp), e = iter.next();
        !e.done && suggestions.length <= BaseEditorSimpleWorker._suggestionsLimit;
        e = iter.next()
      ) {
        var word = e.value;
        if (seen[word]) {
          continue;
        }
        seen[word] = true;
        if (!isNaN(Number(word))) {
          continue;
        }
        suggestions.push({
          kind: 18 /* Text */,
          label: word,
          insertText: word,
          range: {
            startLineNumber: position.lineNumber,
            startColumn: wordUntil.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: wordUntil.endColumn,
          },
        });
      }
      return Promise.resolve({ suggestions: suggestions });
    };
    // ---- END suggest --------------------------------------------------------------------------
    //#region -- word ranges --
    BaseEditorSimpleWorker.prototype.computeWordRanges = function(
      modelUrl,
      range,
      wordDef,
      wordDefFlags
    ) {
      var model = this._getModel(modelUrl);
      if (!model) {
        return Promise.resolve(Object.create(null));
      }
      var wordDefRegExp = new RegExp(wordDef, wordDefFlags);
      var result = Object.create(null);
      for (var line = range.startLineNumber; line < range.endLineNumber; line++) {
        var words = model.getLineWords(line, wordDefRegExp);
        for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
          var word = words_1[_i];
          if (!isNaN(Number(word.word))) {
            continue;
          }
          var array = result[word.word];
          if (!array) {
            array = [];
            result[word.word] = array;
          }
          array.push({
            startLineNumber: line,
            startColumn: word.startColumn,
            endLineNumber: line,
            endColumn: word.endColumn,
          });
        }
      }
      return Promise.resolve(result);
    };
    //#endregion
    BaseEditorSimpleWorker.prototype.navigateValueSet = function(
      modelUrl,
      range,
      up,
      wordDef,
      wordDefFlags
    ) {
      var model = this._getModel(modelUrl);
      if (!model) {
        return Promise.resolve(null);
      }
      var wordDefRegExp = new RegExp(wordDef, wordDefFlags);
      if (range.startColumn === range.endColumn) {
        range = {
          startLineNumber: range.startLineNumber,
          startColumn: range.startColumn,
          endLineNumber: range.endLineNumber,
          endColumn: range.endColumn + 1,
        };
      }
      var selectionText = model.getValueInRange(range);
      var wordRange = model.getWordAtPosition(
        { lineNumber: range.startLineNumber, column: range.startColumn },
        wordDefRegExp
      );
      if (!wordRange) {
        return Promise.resolve(null);
      }
      var word = model.getValueInRange(wordRange);
      var result = BasicInplaceReplace.INSTANCE.navigateValueSet(
        range,
        selectionText,
        wordRange,
        word,
        up
      );
      return Promise.resolve(result);
    };
    // ---- BEGIN foreign module support --------------------------------------------------------------------------
    BaseEditorSimpleWorker.prototype.loadForeignModule = function(moduleId, createData) {
      var _this = this;
      var ctx = {
        getMirrorModels: function() {
          return _this._getModels();
        },
      };
      if (this._foreignModuleFactory) {
        this._foreignModule = this._foreignModuleFactory(ctx, createData);
        // static foreing module
        var methods = [];
        for (var _i = 0, _a = getAllPropertyNames(this._foreignModule); _i < _a.length; _i++) {
          var prop = _a[_i];
          if (typeof this._foreignModule[prop] === 'function') {
            methods.push(prop);
          }
        }
        return Promise.resolve(methods);
      }
      // ESM-comment-begin
      // 		return new Promise<any>((resolve, reject) => {
      // 			require([moduleId], (foreignModule: { create: IForeignModuleFactory }) => {
      // 				this._foreignModule = foreignModule.create(ctx, createData);
      //
      // 				let methods: string[] = [];
      // 				for (const prop of getAllPropertyNames(this._foreignModule)) {
      // 					if (typeof this._foreignModule[prop] === 'function') {
      // 						methods.push(prop);
      // 					}
      // 				}
      //
      // 				resolve(methods);
      //
      // 			}, reject);
      // 		});
      // ESM-comment-end
      // ESM-uncomment-begin
      return Promise.reject(new Error('Unexpected usage'));
      // ESM-uncomment-end
    };
    // foreign method request
    BaseEditorSimpleWorker.prototype.fmr = function(method, args) {
      if (!this._foreignModule || typeof this._foreignModule[method] !== 'function') {
        return Promise.reject(new Error('Missing requestHandler or method: ' + method));
      }
      try {
        return Promise.resolve(this._foreignModule[method].apply(this._foreignModule, args));
      } catch (e) {
        return Promise.reject(e);
      }
    };
    // ---- END diff --------------------------------------------------------------------------
    // ---- BEGIN minimal edits ---------------------------------------------------------------
    BaseEditorSimpleWorker._diffLimit = 100000;
    // ---- BEGIN suggest --------------------------------------------------------------------------
    BaseEditorSimpleWorker._suggestionsLimit = 10000;
    return BaseEditorSimpleWorker;
  })();
  /**
   * @internal
   */
  var EditorSimpleWorkerImpl = /** @class */ (function(_super) {
    __extends$5(EditorSimpleWorkerImpl, _super);
    function EditorSimpleWorkerImpl(foreignModuleFactory) {
      var _this = _super.call(this, foreignModuleFactory) || this;
      _this._models = Object.create(null);
      return _this;
    }
    EditorSimpleWorkerImpl.prototype.dispose = function() {
      this._models = Object.create(null);
    };
    EditorSimpleWorkerImpl.prototype._getModel = function(uri) {
      return this._models[uri];
    };
    EditorSimpleWorkerImpl.prototype._getModels = function() {
      var _this = this;
      var all = [];
      Object.keys(this._models).forEach(function(key) {
        return all.push(_this._models[key]);
      });
      return all;
    };
    EditorSimpleWorkerImpl.prototype.acceptNewModel = function(data) {
      this._models[data.url] = new MirrorModel(
        URI.parse(data.url),
        data.lines,
        data.EOL,
        data.versionId
      );
    };
    EditorSimpleWorkerImpl.prototype.acceptModelChanged = function(strURL, e) {
      if (!this._models[strURL]) {
        return;
      }
      var model = this._models[strURL];
      model.onEvents(e);
    };
    EditorSimpleWorkerImpl.prototype.acceptRemovedModel = function(strURL) {
      if (!this._models[strURL]) {
        return;
      }
      delete this._models[strURL];
    };
    return EditorSimpleWorkerImpl;
  })(BaseEditorSimpleWorker);
  if (typeof importScripts === 'function') {
    // Running in a web worker
    globals.monaco = createMonacoBaseAPI();
  }

  /*---------------------------------------------------------------------------------------------
   *  Copyright (c) Microsoft Corporation. All rights reserved.
   *  Licensed under the MIT License. See License.txt in the project root for license information.
   *--------------------------------------------------------------------------------------------*/
  var initialized = false;
  function initialize(foreignModule) {
    if (initialized) {
      return;
    }
    initialized = true;
    var editorWorker = new EditorSimpleWorkerImpl(foreignModule);
    var simpleWorker = new SimpleWorkerServer(function(msg) {
      self.postMessage(msg);
    }, editorWorker);
    self.onmessage = function(e) {
      simpleWorker.onmessage(e.data);
    };
  }
  self.onmessage = function(e) {
    // Ignore first message in this case and initialize if not yet initialized
    if (!initialized) {
      initialize(null);
    }
  };

  var worker = /*#__PURE__*/ Object.freeze({
    initialize: initialize,
  });

  self.worker = worker;
});
