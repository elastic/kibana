"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiCheckBoxLabel = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

var _check_box = require("./check_box");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var KuiCheckBoxLabel = function KuiCheckBoxLabel(_ref) {
  var className = _ref.className,
      text = _ref.text,
      isChecked = _ref.isChecked,
      isDisabled = _ref.isDisabled,
      onChange = _ref.onChange,
      rest = _objectWithoutProperties(_ref, ["className", "text", "isChecked", "isDisabled", "onChange"]);

  var classes = (0, _classnames.default)('kuiCheckBoxLabel', className);
  return _react.default.createElement("label", _extends({
    className: classes
  }, rest), _react.default.createElement(_check_box.KuiCheckBox, {
    isChecked: isChecked,
    isDisabled: isDisabled,
    onChange: onChange
  }), _react.default.createElement("span", {
    className: "kuiCheckBoxLabel__text"
  }, text));
};

exports.KuiCheckBoxLabel = KuiCheckBoxLabel;
KuiCheckBoxLabel.defaultProps = {
  isChecked: false,
  isDisabled: false
};
KuiCheckBoxLabel.propTypes = {
  className: _propTypes.default.string,
  text: _propTypes.default.string,
  isChecked: _propTypes.default.bool,
  isDisabled: _propTypes.default.bool,
  onChange: _propTypes.default.func.isRequired
};
