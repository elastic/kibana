"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.i18nDirective = i18nDirective;

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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
var HTML_KEY_PREFIX = 'html_';
var PLACEHOLDER_SEPARATOR = '@I18N@';

function i18nDirective(i18n, $sanitize) {
  return {
    restrict: 'A',
    scope: {
      id: '@i18nId',
      defaultMessage: '@i18nDefaultMessage',
      values: '<?i18nValues'
    },
    link: function link($scope, $element) {
      if ($scope.values) {
        $scope.$watchCollection('values', function () {
          setContent($element, $scope, $sanitize, i18n);
        });
      } else {
        setContent($element, $scope, $sanitize, i18n);
      }
    }
  };
}

function setContent($element, $scope, $sanitize, i18n) {
  var originalValues = $scope.values;
  var valuesWithPlaceholders = {};
  var hasValuesWithPlaceholders = false; // If we have values with the keys that start with HTML_KEY_PREFIX we should replace
  // them with special placeholders that later on will be inserted as HTML
  // into the DOM, the rest of the content will be treated as text. We don't
  // sanitize values at this stage as some of the values can be excluded from
  // the translated string (e.g. not used by ICU conditional statements).

  if (originalValues) {
    for (var _i = 0, _Object$entries = Object.entries(originalValues); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
          key = _Object$entries$_i[0],
          value = _Object$entries$_i[1];

      if (key.startsWith(HTML_KEY_PREFIX)) {
        valuesWithPlaceholders[key.slice(HTML_KEY_PREFIX.length)] = "".concat(PLACEHOLDER_SEPARATOR).concat(key).concat(PLACEHOLDER_SEPARATOR);
        hasValuesWithPlaceholders = true;
      } else {
        valuesWithPlaceholders[key] = value;
      }
    }
  }

  var label = i18n($scope.id, {
    values: valuesWithPlaceholders,
    defaultMessage: $scope.defaultMessage
  }); // If there are no placeholders to replace treat everything as text, otherwise
  // insert label piece by piece replacing every placeholder with corresponding
  // sanitized HTML content.

  if (!hasValuesWithPlaceholders) {
    $element.text(label);
  } else {
    $element.empty();
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = label.split(PLACEHOLDER_SEPARATOR)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var contentOrPlaceholder = _step.value;

        if (!contentOrPlaceholder) {
          continue;
        }

        $element.append(originalValues.hasOwnProperty(contentOrPlaceholder) ? $sanitize(originalValues[contentOrPlaceholder]) : document.createTextNode(contentOrPlaceholder));
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return != null) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  }
}