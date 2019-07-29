function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
export var FilterStateStore;

(function (FilterStateStore) {
  FilterStateStore["APP_STATE"] = "appState";
  FilterStateStore["GLOBAL_STATE"] = "globalState";
})(FilterStateStore || (FilterStateStore = {}));

export function buildEmptyFilter(isPinned, index) {
  var meta = {
    disabled: false,
    negate: false,
    alias: null,
    index: index
  };
  var $state = {
    store: isPinned ? FilterStateStore.GLOBAL_STATE : FilterStateStore.APP_STATE
  };
  return {
    meta: meta,
    $state: $state
  };
}
export function isFilterPinned(filter) {
  return filter.$state && filter.$state.store === FilterStateStore.GLOBAL_STATE;
}
export function toggleFilterDisabled(filter) {
  var disabled = !filter.meta.disabled;

  var meta = _objectSpread({}, filter.meta, {
    disabled: disabled
  });

  return _objectSpread({}, filter, {
    meta: meta
  });
}
export function toggleFilterNegated(filter) {
  var negate = !filter.meta.negate;

  var meta = _objectSpread({}, filter.meta, {
    negate: negate
  });

  return _objectSpread({}, filter, {
    meta: meta
  });
}
export function toggleFilterPinned(filter) {
  var store = isFilterPinned(filter) ? FilterStateStore.APP_STATE : FilterStateStore.GLOBAL_STATE;

  var $state = _objectSpread({}, filter.$state, {
    store: store
  });

  return _objectSpread({}, filter, {
    $state: $state
  });
}
export function enableFilter(filter) {
  return !filter.meta.disabled ? filter : toggleFilterDisabled(filter);
}
export function disableFilter(filter) {
  return filter.meta.disabled ? filter : toggleFilterDisabled(filter);
}
export function pinFilter(filter) {
  return isFilterPinned(filter) ? filter : toggleFilterPinned(filter);
}
export function unpinFilter(filter) {
  return !isFilterPinned(filter) ? filter : toggleFilterPinned(filter);
}