"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiText = exports.KuiTitle = exports.SIZES = void 0;

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = require("react");

var _classnames = _interopRequireDefault(require("classnames"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var sizeToClassNameMap = {
  small: 'kuiTitle--small',
  large: 'kuiTitle--large'
};
var SIZES = Object.keys(sizeToClassNameMap);
exports.SIZES = SIZES;

var KuiTitle = function KuiTitle(_ref) {
  var size = _ref.size,
      children = _ref.children,
      className = _ref.className,
      rest = _objectWithoutProperties(_ref, ["size", "children", "className"]);

  var classes = (0, _classnames.default)('kuiTitle', sizeToClassNameMap[size], className);

  var props = _objectSpread({
    className: classes
  }, rest);

  return (0, _react.cloneElement)(children, props);
};

exports.KuiTitle = KuiTitle;
KuiTitle.propTypes = {
  children: _propTypes.default.node.isRequired,
  size: _propTypes.default.oneOf(SIZES)
};

var KuiText = function KuiText(_ref2) {
  var children = _ref2.children,
      className = _ref2.className,
      rest = _objectWithoutProperties(_ref2, ["children", "className"]);

  var classes = (0, _classnames.default)('kuiText', className);

  var props = _objectSpread({
    className: classes
  }, rest);

  return (0, _react.cloneElement)(children, props);
};

exports.KuiText = KuiText;
KuiText.propTypes = {
  children: _propTypes.default.node.isRequired
};
