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
  const formattedMessageDelimiter = message.match(/@__.{10}__@/);

  if (formattedMessageDelimiter !== null) {
    return message.split(formattedMessageDelimiter[0]).map(part => part.startsWith('ELEMENT-') ? part : (0, _pseudo_locale.translateUsingPseudoLocale)(part)).join(formattedMessageDelimiter[0]);
  }

  return (0, _pseudo_locale.translateUsingPseudoLocale)(message);
}
/**
 * If pseudo locale is detected, default intl.formatMessage should be decorated
 * with the pseudo localization function.
 * @param child I18nProvider child component.
 */


function wrapIntlFormatMessage(child) {
  return React.createElement((0, _inject.injectI18n)(({
    intl
  }) => {
    const formatMessage = intl.formatMessage;

    intl.formatMessage = (...args) => translateFormattedMessageUsingPseudoLocale(formatMessage(...args));

    return React.Children.only(child);
  }));
}
/**
 * The library uses the provider pattern to scope an i18n context to a tree
 * of components. This component is used to setup the i18n context for a tree.
 * IntlProvider should wrap react app's root component (inside each react render method).
 */


class I18nProvider extends React.PureComponent {
  render() {
    return React.createElement(_reactIntl.IntlProvider, {
      locale: i18n.getLocale(),
      messages: i18n.getTranslation().messages,
      defaultLocale: i18n.getDefaultLocale(),
      formats: i18n.getFormats(),
      textComponent: React.Fragment
    }, (0, _pseudo_locale.isPseudoLocale)(i18n.getLocale()) && React.isValidElement(this.props.children) ? wrapIntlFormatMessage(this.props.children) : this.props.children);
  }

}

exports.I18nProvider = I18nProvider;

_defineProperty(I18nProvider, "propTypes", {
  children: PropTypes.element.isRequired
});