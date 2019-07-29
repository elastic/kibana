"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiLocalTab = KuiLocalTab;

var _classnames = _interopRequireDefault(require("classnames"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireDefault(require("react"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function KuiLocalTab(_ref) {
  var className = _ref.className,
      children = _ref.children,
      isDisabled = _ref.isDisabled,
      isSelected = _ref.isSelected,
      rest = _objectWithoutProperties(_ref, ["className", "children", "isDisabled", "isSelected"]);

  var classes = (0, _classnames.default)('kuiLocalTab', className, {
    'kuiLocalTab-isDisabled': isDisabled,
    'kuiLocalTab-isSelected': isSelected
  });
  return _react.default.createElement("a", _extends({
    className: classes
  }, rest), children);
}

KuiLocalTab.propTypes = {
  className: _propTypes.default.string,
  children: _propTypes.default.node,
  isDisabled: _propTypes.default.bool,
  isSelected: _propTypes.default.bool
};
KuiLocalTab.defaultProps = {
  isDisabled: false,
  isSelected: false
};
