(function(angular, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define('ngStorage', ['angular'], function(angular) {
            return factory(angular);
        });
    } else {
        return factory(angular);
    }
}(typeof angular === 'undefined' ? null : angular, function(angular) {

    'use strict';

    /**
     * @ngdoc overview
     * @name ngStorage
     */

    angular.module('ngStorage', [])

    /**
     * @ngdoc object
     * @name ngStorage.$localStorage
     * @requires $rootScope
     * @requires $window
     */

    .factory('$localStorage', _storageFactory('localStorage'))

    /**
     * @ngdoc object
     * @name ngStorage.$sessionStorage
     * @requires $rootScope
     * @requires $window
     */

    .factory('$sessionStorage', _storageFactory('sessionStorage'));

    function _storageFactory(storageType) {
        return [
            '$rootScope',
            '$window',
            '$log',
            '$timeout',

            function(
                $rootScope,
                $window,
                $log,
                $timeout
            ){
                function isStorageSupported(storageType) {

                    // Some installations of IE, for an unknown reason, throw "SCRIPT5: Error: Access is denied"
                    // when accessing window.localStorage. This happens before you try to do anything with it. Catch
                    // that error and allow execution to continue.

                    // fix 'SecurityError: DOM Exception 18' exception in Desktop Safari, Mobile Safari
                    // when "Block cookies": "Always block" is turned on
                    var supported;
                    try {
                        supported = $window[storageType];
                    }
                    catch (err) {
                        supported = false;
                    }

                    // When Safari (OS X or iOS) is in private browsing mode, it appears as though localStorage
                    // is available, but trying to call .setItem throws an exception below:
                    // "QUOTA_EXCEEDED_ERR: DOM Exception 22: An attempt was made to add something to storage that exceeded the quota."
                    if (supported && storageType === 'localStorage') {
                        var key = '__' + Math.round(Math.random() * 1e7);

                        try {
                            localStorage.setItem(key, key);
                            localStorage.removeItem(key);
                        }
                        catch (err) {
                            supported = false;
                        }
                    }

                    return supported;
                }

                // #9: Assign a placeholder object if Web Storage is unavailable to prevent breaking the entire AngularJS app
                var webStorage = isStorageSupported(storageType) || ($log.warn('This browser does not support Web Storage!'), {setItem: function() {}, getItem: function() {}}),
                    $storage = {
                        $default: function(items) {
                            for (var k in items) {
                                angular.isDefined($storage[k]) || ($storage[k] = items[k]);
                            }

                            return $storage;
                        },
                        $reset: function(items) {
                            for (var k in $storage) {
                                '$' === k[0] || (delete $storage[k] && webStorage.removeItem('ngStorage-' + k));
                            }

                            return $storage.$default(items);
                        }
                    },
                    _last$storage,
                    _debounce;

                try {
                    webStorage = $window[storageType];
                    webStorage.length;
                } catch(e) {
                    $log.warn('This browser does not support Web Storage!');
                    webStorage = {};
                }

                for (var i = 0, l = webStorage.length, k; i < l; i++) {
                    // #8, #10: `webStorage.key(i)` may be an empty string (or throw an exception in IE9 if `webStorage` is empty)
                    (k = webStorage.key(i)) && 'ngStorage-' === k.slice(0, 10) && ($storage[k.slice(10)] = angular.fromJson(webStorage.getItem(k)));
                }

                _last$storage = angular.copy($storage);

                $rootScope.$watch(function() {
                    var temp$storage;
                    _debounce || (_debounce = $timeout(function() {
                        _debounce = null;

                        if (!angular.equals($storage, _last$storage)) {
                            temp$storage = angular.copy(_last$storage);
                            angular.forEach($storage, function(v, k) {
                                angular.isDefined(v) && '$' !== k[0] && webStorage.setItem('ngStorage-' + k, angular.toJson(v));

                                delete temp$storage[k];
                            });

                            for (var k in temp$storage) {
                                webStorage.removeItem('ngStorage-' + k);
                            }

                            _last$storage = angular.copy($storage);
                        }
                    }, 100, false));
                });

                // #6: Use `$window.addEventListener` instead of `angular.element` to avoid the jQuery-specific `event.originalEvent`
                'localStorage' === storageType && $window.addEventListener && $window.addEventListener('storage', function(event) {
                    if ('ngStorage-' === event.key.slice(0, 10)) {
                        event.newValue ? $storage[event.key.slice(10)] = angular.fromJson(event.newValue) : delete $storage[event.key.slice(10)];

                        _last$storage = angular.copy($storage);

                        $rootScope.$apply();
                    }
                });

                return $storage;
            }
        ];
    }

}));
