function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _construct(Parent, args, Class) { if (isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

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
import { repeat } from 'lodash';
import { i18n } from '@kbn/i18n';
var endOfInputText = i18n.translate('kbnESQuery.kql.errors.endOfInputText', {
  defaultMessage: 'end of input'
});
export var KQLSyntaxError =
/*#__PURE__*/
function (_Error) {
  _inherits(KQLSyntaxError, _Error);

  function KQLSyntaxError(error, expression) {
    var _this;

    _classCallCheck(this, KQLSyntaxError);

    var grammarRuleTranslations = {
      fieldName: i18n.translate('kbnESQuery.kql.errors.fieldNameText', {
        defaultMessage: 'field name'
      }),
      value: i18n.translate('kbnESQuery.kql.errors.valueText', {
        defaultMessage: 'value'
      }),
      literal: i18n.translate('kbnESQuery.kql.errors.literalText', {
        defaultMessage: 'literal'
      }),
      whitespace: i18n.translate('kbnESQuery.kql.errors.whitespaceText', {
        defaultMessage: 'whitespace'
      })
    };
    var translatedExpectations = error.expected.map(function (expected) {
      return grammarRuleTranslations[expected.description] || expected.description;
    });
    var translatedExpectationText = translatedExpectations.join(', ');
    var message = i18n.translate('kbnESQuery.kql.errors.syntaxError', {
      defaultMessage: 'Expected {expectedList} but {foundInput} found.',
      values: {
        expectedList: translatedExpectationText,
        foundInput: error.found ? "\"".concat(error.found, "\"") : endOfInputText
      }
    });
    var fullMessage = [message, expression, repeat('-', error.location.start.offset) + '^'].join('\n');
    _this = _possibleConstructorReturn(this, _getPrototypeOf(KQLSyntaxError).call(this, fullMessage));
    _this.name = 'KQLSyntaxError';
    _this.shortMessage = message;
    return _this;
  }

  return KQLSyntaxError;
}(_wrapNativeSuper(Error));