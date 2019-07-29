"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiSelect = exports.SELECT_SIZE = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var sizeToClassNameMap = {
  small: 'kuiSelect--small',
  medium: undefined,
  large: 'kuiSelect--large'
};
var SELECT_SIZE = Object.keys(sizeToClassNameMap);
exports.SELECT_SIZE = SELECT_SIZE;

var KuiSelect = function KuiSelect(_ref) {
  var className = _ref.className,
      onChange = _ref.onChange,
      isInvalid = _ref.isInvalid,
      isDisabled = _ref.isDisabled,
      size = _ref.size,
      children = _ref.children,
      rest = _objectWithoutProperties(_ref, ["className", "onChange", "isInvalid", "isDisabled", "size", "children"]);

  var classes = (0, _classnames.default)('kuiSelect', className, {
    'kuiSelect-isInvalid': isInvalid
  }, sizeToClassNameMap[size]);
  return _react.default.createElement("select", _extends({
    className: classes,
    onChange: onChange,
    disabled: isDisabled
  }, rest), children);
};

exports.KuiSelect = KuiSelect;
KuiSelect.defaultProps = {
  isInvalid: false,
  isDisabled: false,
  size: 'medium'
};
KuiSelect.propTypes = {
  className: _propTypes.default.string,
  onChange: _propTypes.default.func.isRequired,
  isInvalid: _propTypes.default.bool,
  isDisabled: _propTypes.default.bool,
  size: _propTypes.default.oneOf(SELECT_SIZE),
  children: _propTypes.default.node
};
