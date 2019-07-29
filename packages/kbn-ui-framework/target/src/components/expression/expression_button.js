"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiExpressionButton = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var KuiExpressionButton = function KuiExpressionButton(_ref) {
  var className = _ref.className,
      description = _ref.description,
      buttonValue = _ref.buttonValue,
      isActive = _ref.isActive,
      onClick = _ref.onClick,
      rest = _objectWithoutProperties(_ref, ["className", "description", "buttonValue", "isActive", "onClick"]);

  var classes = (0, _classnames.default)('kuiExpressionButton', className, {
    'kuiExpressionButton-isActive': isActive
  });
  return _react.default.createElement("button", _extends({
    className: classes,
    onClick: onClick
  }, rest), _react.default.createElement("span", {
    className: "kuiExpressionButton__description"
  }, description), ' ', _react.default.createElement("span", {
    className: "kuiExpressionButton__value"
  }, buttonValue));
};

exports.KuiExpressionButton = KuiExpressionButton;
KuiExpressionButton.propTypes = {
  className: _propTypes.default.string,
  description: _propTypes.default.string.isRequired,
  buttonValue: _propTypes.default.string.isRequired,
  isActive: _propTypes.default.bool.isRequired,
  onClick: _propTypes.default.func.isRequired
};
KuiExpressionButton.defaultProps = {
  isActive: false
};
