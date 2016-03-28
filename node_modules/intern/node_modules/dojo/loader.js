(function () {
    var req = function (config, dependencies, callback) {
        if (Array.isArray(config) || typeof config === 'string') {
            callback = dependencies;
            dependencies = config;
            config = {};
        }
        if (has('loader-configurable')) {
            configure(config);
        }
        contextRequire(dependencies, callback);
    };
    var has = req.has = (function () {
        var hasCache = Object.create(null);
        var global = this;
        var document = global.document;
        var element = document && document.createElement('div');
        var has = function (name) {
            return typeof hasCache[name] === 'function' ? (hasCache[name] = hasCache[name](global, document, element)) : hasCache[name];
        };
        has.add = function (name, test, now, force) {
            (!(name in hasCache) || force) && (hasCache[name] = test);
            now && has(name);
        };
        return has;
    })();
    has.add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');
    has.add('host-node', typeof process === 'object' && process.versions && process.versions.node);
    has.add('debug', true);
    has.add('loader-ie9-compat', has('host-browser') && navigator.userAgent.indexOf('MSIE 9.0') > -1);
    has.add('loader-configurable', true);
    if (has('loader-configurable')) {
        var configure = req.config = function (config) {
            baseUrl = (config.baseUrl || baseUrl).replace(/\/*$/, '/');
            forEach(config.packages, function (p) {
                if (typeof p === 'string') {
                    p = { name: p, location: p };
                }
                if (p.location != null) {
                    p.location = p.location.replace(/\/*$/, '/');
                }
                packs[p.name] = p;
            });
            function computeMapProg(map) {
                // This method takes a map as represented by a JavaScript object and initializes an array of
                // arrays of (map-key, map-value, regex-for-map-key, length-of-map-key), sorted decreasing by length-
                // of-map-key. The regex looks for the map-key followed by either "/" or end-of-string at the beginning
                // of a the search source.
                //
                // Maps look like this:
                //
                // map: { C: { D: E } }
                //      A    B
                //
                // The computed mapping is a 4-array deep tree, where the outermost array corresponds to the source
                // mapping object A, the 2nd level arrays each correspond to one of the source mappings C -> B, the 3rd
                // level arrays correspond to each destination mapping object B, and the innermost arrays each
                // correspond to one of the destination mappings D -> E.
                //
                // So, the overall structure looks like this:
                //
                // mapProgs = [ source mapping array, source mapping array, ... ]
                // source mapping array = [
                //     source module id,
                //     [ destination mapping array, destination mapping array, ... ],
                //     RegExp that matches on source module id,
                //     source module id length
                // ]
                // destination mapping array = [
                //     original module id,
                //     destination module id,
                //     RegExp that matches on original module id,
                //     original module id length
                // ]
                var result = [];
                for (var moduleId in map) {
                    var value = map[moduleId];
                    var valueIsMapReplacement = typeof value === 'object';
                    var item = {
                        0: moduleId,
                        1: valueIsMapReplacement ? computeMapProg(value) : value,
                        2: new RegExp('^' + moduleId.replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&') + '(?:\/|$)'),
                        3: moduleId.length
                    };
                    result.push(item);
                    if (valueIsMapReplacement && moduleId === '*') {
                        result.star = item[1];
                    }
                }
                result.sort(function (lhs, rhs) {
                    return rhs[3] - lhs[3];
                });
                return result;
            }
            mix(map, config.map);
            mapProgs = computeMapProg(map);
            config.paths && (pathsMapProg = computeMapProg(config.paths));
        };
    }
    var baseUrl = './';
    var packs = {};
    var pathsMapProg = [];
    var map = {};
    var mapProgs = [];
    var modules = {};
    var cache = {};
    var pendingCacheInsert = {};
    function forEach(array, callback) {
        array && array.forEach(callback);
    }
    function mix(target, source) {
        for (var key in source) {
            target[key] = source[key];
        }
        return target;
    }
    function signal(type, event) {
        req.signal.apply(req, arguments);
    }
    function consumePendingCacheInsert(referenceModule) {
        var item;
        for (var key in pendingCacheInsert) {
            item = pendingCacheInsert[key];
            cache[typeof item === 'string' ? toUrl(key, referenceModule) : getModuleInfo(key, referenceModule).mid] = item;
        }
        pendingCacheInsert = {};
    }
    var uidGenerator = 0;
    function contextRequire(a1, a2, referenceModule) {
        var module;
        if (typeof a1 === 'string') {
            module = getModule(a1, referenceModule);
            if (module.executed !== true && module.executed !== EXECUTING) {
                throw new Error('Attempt to require unloaded module ' + module.mid);
            }
            module = module.result;
        }
        else if (Array.isArray(a1)) {
            module = getModuleInfo('*' + (++uidGenerator));
            mix(module, {
                deps: resolveDeps(a1, module, referenceModule),
                def: a2 || {},
                gc: true
            });
            guardCheckComplete(function () {
                forEach(module.deps, injectModule.bind(null, module));
            });
            execQ.push(module);
            checkComplete();
        }
        return module;
    }
    function createRequire(module) {
        var result = (!module && req) || module.require;
        if (!result) {
            module.require = result = function (a1, a2) {
                return contextRequire(a1, a2, module);
            };
            mix(mix(result, req), {
                toUrl: function (name) {
                    return toUrl(name, module);
                },
                toAbsMid: function (mid) {
                    return toAbsMid(mid, module);
                }
            });
        }
        return result;
    }
    var execQ = [];
    var defArgs = null;
    var waitingCount = 0;
    function runMapProg(targetMid, map) {
        if (map) {
            for (var i = 0, j = map.length; i < j; ++i) {
                if (map[i][2].test(targetMid)) {
                    return map[i];
                }
            }
        }
        return null;
    }
    function compactPath(path) {
        var result = [];
        var segment;
        var lastSegment;
        var splitPath = path.replace(/\\/g, '/').split('/');
        while (splitPath.length) {
            segment = splitPath.shift();
            if (segment === '..' && result.length && lastSegment !== '..') {
                result.pop();
                lastSegment = result[result.length - 1];
            }
            else if (segment !== '.') {
                result.push((lastSegment = segment));
            }
        }
        return result.join('/');
    }
    function getModuleInfo(mid, referenceModule) {
        var match;
        var pid;
        var pack;
        var midInPackage;
        var mapItem;
        var url;
        var result;
        mid = compactPath(/^\./.test(mid) && referenceModule ? (referenceModule.mid + '/../' + mid) : mid);
        var moduleMap = referenceModule && runMapProg(referenceModule.mid, mapProgs);
        moduleMap = moduleMap ? moduleMap[1] : mapProgs.star;
        if ((mapItem = runMapProg(mid, moduleMap))) {
            mid = mapItem[1] + mid.slice(mapItem[3]);
        }
        match = mid.match(/^([^\/]+)(\/(.+))?$/);
        pid = match ? match[1] : '';
        pack = packs[pid];
        if (pack) {
            mid = pid + '/' + (midInPackage = (match[3] || pack.main || 'main'));
        }
        else {
            pid = '';
        }
        if (!(result = modules[mid])) {
            mapItem = runMapProg(mid, pathsMapProg);
            url = mapItem ? mapItem[1] + mid.slice(mapItem[3]) : (pid ? pack.location + midInPackage : mid);
            result = {
                pid: pid,
                mid: mid,
                pack: pack,
                url: compactPath((/^(?:\/|\w+:)/.test(url) ? '' : baseUrl) +
                    url +
                    (/\.js(?:\?[^?]*)?$/.test(url) ? '' : '.js'))
            };
        }
        return result;
    }
    function resolvePluginResourceId(plugin, prid, contextRequire) {
        return plugin.normalize ? plugin.normalize(prid, contextRequire.toAbsMid) : contextRequire.toAbsMid(prid);
    }
    function getModule(mid, referenceModule) {
        var match;
        var plugin;
        var prid;
        var result;
        var contextRequire;
        var loaded;
        match = mid.match(/^(.+?)\!(.*)$/);
        if (match) {
            plugin = getModule(match[1], referenceModule);
            loaded = Boolean(plugin.load);
            contextRequire = createRequire(referenceModule);
            if (loaded) {
                prid = resolvePluginResourceId(plugin, match[2], contextRequire);
                mid = (plugin.mid + '!' + (plugin.dynamic ? ++uidGenerator + '!' : '') + prid);
            }
            else {
                prid = match[2];
                mid = plugin.mid + '!' + (++uidGenerator) + '!*';
            }
            result = {
                plugin: plugin,
                mid: mid,
                req: contextRequire,
                prid: prid,
                fix: !loaded
            };
        }
        else {
            result = getModuleInfo(mid, referenceModule);
        }
        return modules[result.mid] || (modules[result.mid] = result);
    }
    function toAbsMid(mid, referenceModule) {
        return getModuleInfo(mid, referenceModule).mid;
    }
    function toUrl(name, referenceModule) {
        var moduleInfo = getModuleInfo(name + '/x', referenceModule);
        var url = moduleInfo.url;
        return url.slice(0, url.length - 5);
    }
    function makeCjs(mid) {
        var module = modules[mid] = {
            mid: mid,
            injected: true,
            executed: true
        };
        return module;
    }
    var cjsRequireModule = makeCjs('require');
    var cjsExportsModule = makeCjs('exports');
    var cjsModuleModule = makeCjs('module');
    var EXECUTING = 'executing';
    var abortExec = {};
    var executedSomething = false;
    has.add('loader-debug-circular-dependencies', true);
    if (has('loader-debug-circular-dependencies')) {
        var circularTrace = [];
    }
    function execModule(module) {
        if (module.executed === EXECUTING) {
            if (has('loader-debug-circular-dependencies') &&
                module.deps.indexOf(cjsExportsModule) === -1 &&
                typeof console !== 'undefined') {
                console.warn('Circular dependency: ' + circularTrace.concat(module.mid).join(' -> '));
            }
            return module.cjs.exports;
        }
        if (!module.executed) {
            if (!module.def && !module.deps) {
                return abortExec;
            }
            var deps = module.deps;
            var factory = module.def;
            var result;
            var args;
            has('loader-debug-circular-dependencies') && circularTrace.push(module.mid);
            module.executed = EXECUTING;
            args = deps.map(function (dep) {
                if (result !== abortExec) {
                    result = ((dep === cjsRequireModule) ? createRequire(module) :
                        ((dep === cjsExportsModule) ? module.cjs.exports :
                            ((dep === cjsModuleModule) ? module.cjs :
                                execModule(dep))));
                }
                return result;
            });
            if (result === abortExec) {
                module.executed = false;
                has('loader-debug-circular-dependencies') && circularTrace.pop();
                return abortExec;
            }
            result = typeof factory === 'function' ? factory.apply(null, args) : factory;
            result = module.result = result === undefined && module.cjs ? module.cjs.exports : result;
            module.executed = true;
            executedSomething = true;
            if (module.gc) {
                modules[module.mid] = undefined;
            }
            result && result.load && ['dynamic', 'normalize', 'load'].forEach(function (key) {
                module[key] = result[key];
            });
            forEach(module.loadQ, function (pseudoPluginResource) {
                var prid = resolvePluginResourceId(module, pseudoPluginResource.prid, pseudoPluginResource.req);
                var mid = module.dynamic ? pseudoPluginResource.mid.replace(/\*$/, prid) : (module.mid + '!' + prid);
                var pluginResource = mix(mix({}, pseudoPluginResource), { mid: mid, prid: prid });
                if (!modules[mid]) {
                    injectPlugin((modules[mid] = pluginResource));
                }
                pseudoPluginResource.fix(modules[mid]);
                --waitingCount;
                modules[pseudoPluginResource.mid] = undefined;
            });
            module.loadQ = undefined;
            has('loader-debug-circular-dependencies') && circularTrace.pop();
        }
        return module.result;
    }
    var checkCompleteGuard = 0;
    function guardCheckComplete(proc) {
        ++checkCompleteGuard;
        proc();
        --checkCompleteGuard;
        !defArgs && !waitingCount && !execQ.length && !checkCompleteGuard && signal('idle', []);
    }
    function checkComplete() {
        !checkCompleteGuard && guardCheckComplete(function () {
            for (var module, i = 0; i < execQ.length;) {
                module = execQ[i];
                if (module.executed === true) {
                    execQ.splice(i, 1);
                }
                else {
                    executedSomething = false;
                    execModule(module);
                    if (executedSomething) {
                        i = 0;
                    }
                    else {
                        i++;
                    }
                }
            }
        });
    }
    function injectPlugin(module) {
        var plugin = module.plugin;
        var onLoad = function (def) {
            module.result = def;
            --waitingCount;
            module.executed = true;
            checkComplete();
        };
        if (plugin.load) {
            plugin.load(module.prid, module.req, onLoad);
        }
        else if (plugin.loadQ) {
            plugin.loadQ.push(module);
        }
        else {
            plugin.loadQ = [module];
            execQ.unshift(plugin);
            injectModule(module, plugin);
        }
    }
    function injectModule(parent, module) {
        if (!module) {
            module = parent;
            parent = null;
        }
        if (module.plugin) {
            injectPlugin(module);
        }
        else if (!module.injected) {
            var cached;
            var onLoadCallback = function (node) {
                consumePendingCacheInsert(module);
                if (has('loader-ie9-compat') && node) {
                    defArgs = node.defArgs;
                }
                if (!defArgs) {
                    defArgs = [[], undefined];
                }
                defineModule(module, defArgs[0], defArgs[1]);
                defArgs = null;
                guardCheckComplete(function () {
                    forEach(module.deps, injectModule.bind(null, module));
                });
                checkComplete();
            };
            ++waitingCount;
            module.injected = true;
            if ((cached = cache[module.mid])) {
                try {
                    cached();
                    onLoadCallback();
                    return;
                }
                catch (error) {
                    signal('cachedThrew', [error, module]);
                }
            }
            injectUrl(module.url, onLoadCallback, module, parent);
        }
    }
    function resolveDeps(deps, module, referenceModule) {
        return deps.map(function (dep, i) {
            var result = getModule(dep, referenceModule);
            if (result.fix) {
                result.fix = function (m) {
                    module.deps[i] = m;
                };
            }
            return result;
        });
    }
    function defineModule(module, deps, def) {
        --waitingCount;
        return mix(module, {
            def: def,
            deps: resolveDeps(deps, module, module),
            cjs: {
                id: module.mid,
                uri: module.url,
                exports: (module.result = {}),
                setExports: function (exports) {
                    module.cjs.exports = exports;
                }
            }
        });
    }
    has.add('function-bind', Boolean(Function.prototype.bind));
    if (!has('function-bind')) {
        injectModule.bind = function (thisArg) {
            var slice = Array.prototype.slice;
            var args = slice.call(arguments, 1);
            return function () {
                return injectModule.apply(thisArg, args.concat(slice.call(arguments, 0)));
            };
        };
    }
    var setGlobals;
    var injectUrl;
    if (has('host-node')) {
        var vm = require('vm');
        var fs = require('fs');
        req.nodeRequire = require;
        injectUrl = function (url, callback, module, parent) {
            fs.readFile(url, 'utf8', function (error, data) {
                if (error) {
                    throw new Error('Failed to load module ' + module.mid + ' from ' + url + (parent ? ' (parent: ' + parent.mid + ')' : ''));
                }
                var oldModule = this.module;
                this.module = undefined;
                try {
                    vm.runInThisContext(data, url);
                }
                finally {
                    this.module = oldModule;
                }
                callback();
            });
        };
        setGlobals = function (require, define) {
            module.exports = this.require = require;
            this.define = define;
        };
    }
    else if (has('host-browser')) {
        injectUrl = function (url, callback, module, parent) {
            var node = document.createElement('script');
            var handler = function (event) {
                document.head.removeChild(node);
                if (event.type === 'load') {
                    has('loader-ie9-compat') ? callback(node) : callback();
                }
                else {
                    throw new Error('Failed to load module ' + module.mid + ' from ' + url + (parent ? ' (parent: ' + parent.mid + ')' : ''));
                }
            };
            node.addEventListener('load', handler, false);
            node.addEventListener('error', handler, false);
            node.crossOrigin = 'anonymous';
            node.charset = 'utf-8';
            node.src = url;
            document.head.appendChild(node);
        };
        setGlobals = function (require, define) {
            this.require = require;
            this.define = define;
        };
    }
    else {
        throw new Error('Unsupported platform');
    }
    has.add('loader-debug-internals', true);
    if (has('loader-debug-internals')) {
        req.inspect = function (name) {
            return eval(name);
        };
    }
    has.add('loader-undef', true);
    if (has('loader-undef')) {
        req.undef = function (id) {
            if (modules[id]) {
                modules[id] = undefined;
            }
        };
    }
    mix(req, {
        signal: function () { },
        toAbsMid: toAbsMid,
        toUrl: toUrl,
        cache: function (cache) {
            consumePendingCacheInsert();
            pendingCacheInsert = cache;
        }
    });
    Object.defineProperty(req, 'baseUrl', {
        get: function () {
            return baseUrl;
        },
        enumerable: true
    });
    has.add('loader-cjs-wrapping', true);
    if (has('loader-cjs-wrapping')) {
        var comments = /\/\*[\s\S]*?\*\/|\/\/.*$/mg;
        var requireCall = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)/g;
    }
    has.add('loader-explicit-mid', true);
    var define = mix(function (deps, factory) {
        if (has('loader-explicit-mid') && arguments.length === 3) {
            var id = deps;
            deps = factory;
            factory = arguments[2];
            if (id != null) {
                var module = getModule(id);
                module.injected = true;
                defineModule(module, deps, factory);
            }
        }
        if (arguments.length === 1) {
            if (has('loader-cjs-wrapping') && typeof deps === 'function') {
                factory = deps;
                deps = ['require', 'exports', 'module'];
                factory.toString()
                    .replace(comments, '')
                    .replace(requireCall, function () {
                    deps.push(arguments[2]);
                    return arguments[0];
                });
            }
            else if (!Array.isArray(deps)) {
                var value = deps;
                deps = [];
                factory = function () {
                    return value;
                };
            }
        }
        if (has('loader-ie9-compat')) {
            for (var i = document.scripts.length - 1, script; (script = document.scripts[i]); --i) {
                if (script.readyState === 'interactive') {
                    script.defArgs = [deps, factory];
                    break;
                }
            }
        }
        else {
            defArgs = [deps, factory];
        }
    }, {
        amd: { vendor: 'dojotoolkit.org' }
    });
    setGlobals(req, define);
})();
//# sourceMappingURL=_debug/loader.js.map