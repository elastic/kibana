"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.I18nProvider = void 0;

var PropTypes = _interopRequireWildcard(require("prop-types"));

var React = _interopRequireWildcard(require("react"));

var _reactIntl = require("react-intl");

var i18n = _interopRequireWildcard(require("../core"));

var _pseudo_locale = require("../core/pseudo_locale");

var _inject = require("./inject");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * To translate label that includes nested `FormattedMessage` instances React Intl
 * replaces them with special placeholders (@__uid__@ELEMENT-uid-counter@__uid__@)
 * and maps them back with nested translations after `formatMessage` processes
 * original string, so we shouldn't modify these special placeholders with pseudo
 * translations otherwise React Intl won't be able to properly replace placeholders.
 * It's implementation detail of the React Intl, but since pseudo localization is dev
 * only feature we should be fine here.
 * @param message
 */
function translateFormattedMessageUsingPseudoLocale(message) {
  var formattedMessageDelimiter = message.match(/@__.{10}__@/);

  if (formattedMessageDelimiter !== null) {
    return message.split(formattedMessageDelimiter[0]).map(function (part) {
      return part.startsWith('ELEMENT-') ? part : (0, _pseudo_locale.translateUsingPseudoLocale)(part);
    }).join(formattedMessageDelimiter[0]);
  }

  return (0, _pseudo_locale.translateUsingPseudoLocale)(message);
}
/**
 * If pseudo locale is detected, default intl.formatMessage should be decorated
 * with the pseudo localization function.
 * @param child I18nProvider child component.
 */


function wrapIntlFormatMessage(child) {
  return React.createElement((0, _inject.injectI18n)(function (_ref) {
    var intl = _ref.intl;
    var formatMessage = intl.formatMessage;

    intl.formatMessage = function () {
      return translateFormattedMessageUsingPseudoLocale(formatMessage.apply(void 0, arguments));
    };

    return React.Children.only(child);
  }));
}
/**
 * The library uses the provider pattern to scope an i18n context to a tree
 * of components. This component is used to setup the i18n context for a tree.
 * IntlProvider should wrap react app's root component (inside each react render method).
 */


var I18nProvider =
/*#__PURE__*/
function (_React$PureComponent) {
  _inherits(I18nProvider, _React$PureComponent);

  function I18nProvider() {
    _classCallCheck(this, I18nProvider);

    return _possibleConstructorReturn(this, _getPrototypeOf(I18nProvider).apply(this, arguments));
  }

  _createClass(I18nProvider, [{
    key: "render",
    value: function render() {
      return React.createElement(_reactIntl.IntlProvider, {
        locale: i18n.getLocale(),
        messages: i18n.getTranslation().messages,
        defaultLocale: i18n.getDefaultLocale(),
        formats: i18n.getFormats(),
        textComponent: React.Fragment
      }, (0, _pseudo_locale.isPseudoLocale)(i18n.getLocale()) && React.isValidElement(this.props.children) ? wrapIntlFormatMessage(this.props.children) : this.props.children);
    }
  }]);

  return I18nProvider;
}(React.PureComponent);

exports.I18nProvider = I18nProvider;

_defineProperty(I18nProvider, "propTypes", {
  children: PropTypes.element.isRequired
});