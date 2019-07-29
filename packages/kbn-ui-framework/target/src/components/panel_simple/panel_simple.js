"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiPanelSimple = exports.SIZES = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var paddingSizeToClassNameMap = {
  'none': null,
  's': 'kuiPanelSimple--paddingSmall',
  'm': 'kuiPanelSimple--paddingMedium',
  'l': 'kuiPanelSimple--paddingLarge'
};
var SIZES = Object.keys(paddingSizeToClassNameMap);
exports.SIZES = SIZES;

var KuiPanelSimple = function KuiPanelSimple(_ref) {
  var children = _ref.children,
      className = _ref.className,
      paddingSize = _ref.paddingSize,
      hasShadow = _ref.hasShadow,
      grow = _ref.grow,
      panelRef = _ref.panelRef,
      rest = _objectWithoutProperties(_ref, ["children", "className", "paddingSize", "hasShadow", "grow", "panelRef"]);

  var classes = (0, _classnames.default)('kuiPanelSimple', paddingSizeToClassNameMap[paddingSize], {
    'kuiPanelSimple--shadow': hasShadow,
    'kuiPanelSimple--flexGrowZero': !grow
  }, className);
  return _react.default.createElement("div", _extends({
    ref: panelRef,
    className: classes
  }, rest), children);
};

exports.KuiPanelSimple = KuiPanelSimple;
KuiPanelSimple.propTypes = {
  children: _propTypes.default.node,
  className: _propTypes.default.string,
  hasShadow: _propTypes.default.bool,
  paddingSize: _propTypes.default.oneOf(SIZES),
  grow: _propTypes.default.bool,
  panelRef: _propTypes.default.func
};
KuiPanelSimple.defaultProps = {
  paddingSize: 'm',
  hasShadow: false,
  grow: true
};
