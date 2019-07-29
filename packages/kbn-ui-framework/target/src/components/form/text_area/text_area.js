"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiTextArea = exports.TEXTAREA_SIZE = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var sizeToClassNameMap = {
  small: 'kuiTextArea--small',
  medium: undefined,
  large: 'kuiTextArea--large'
};
var TEXTAREA_SIZE = Object.keys(sizeToClassNameMap);
exports.TEXTAREA_SIZE = TEXTAREA_SIZE;

var KuiTextArea = function KuiTextArea(_ref) {
  var className = _ref.className,
      onChange = _ref.onChange,
      isInvalid = _ref.isInvalid,
      isNonResizable = _ref.isNonResizable,
      isDisabled = _ref.isDisabled,
      size = _ref.size,
      rest = _objectWithoutProperties(_ref, ["className", "onChange", "isInvalid", "isNonResizable", "isDisabled", "size"]);

  var classes = (0, _classnames.default)('kuiTextArea', className, {
    'kuiTextArea-isInvalid': isInvalid,
    'kuiTextArea--nonResizable': isNonResizable
  }, sizeToClassNameMap[size]);
  return _react.default.createElement("textarea", _extends({
    className: classes,
    onChange: onChange,
    disabled: isDisabled
  }, rest));
};

exports.KuiTextArea = KuiTextArea;
KuiTextArea.defaultProps = {
  isInvalid: false,
  isNonResizable: false,
  isDisabled: false,
  size: 'medium'
};
KuiTextArea.propTypes = {
  className: _propTypes.default.string,
  onChange: _propTypes.default.func.isRequired,
  isInvalid: _propTypes.default.bool,
  isNonResizable: _propTypes.default.bool,
  isDisabled: _propTypes.default.bool,
  size: _propTypes.default.oneOf(TEXTAREA_SIZE)
};
