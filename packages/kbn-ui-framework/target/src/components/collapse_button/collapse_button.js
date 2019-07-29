"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiCollapseButton = exports.DIRECTIONS = void 0;

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireDefault(require("react"));

var _classnames = _interopRequireDefault(require("classnames"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var DIRECTIONS = ['down', 'up', 'left', 'right'];
exports.DIRECTIONS = DIRECTIONS;
var directionToClassNameMap = {
  down: 'fa-chevron-circle-down',
  up: 'fa-chevron-circle-up',
  left: 'fa-chevron-circle-left',
  right: 'fa-chevron-circle-right'
};

var KuiCollapseButton = function KuiCollapseButton(_ref) {
  var className = _ref.className,
      direction = _ref.direction,
      rest = _objectWithoutProperties(_ref, ["className", "direction"]);

  var classes = (0, _classnames.default)('kuiCollapseButton', className);
  var childClasses = (0, _classnames.default)('kuiIcon', directionToClassNameMap[direction]);
  return _react.default.createElement("button", _extends({
    type: "button",
    className: classes
  }, rest), _react.default.createElement("span", {
    className: childClasses
  }));
};

exports.KuiCollapseButton = KuiCollapseButton;
KuiCollapseButton.propTypes = {
  className: _propTypes.default.string,
  direction: _propTypes.default.oneOf(DIRECTIONS).isRequired
};
