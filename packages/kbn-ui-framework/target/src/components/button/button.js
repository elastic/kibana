"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiSubmitButton = exports.KuiLinkButton = exports.KuiButton = exports.BUTTON_TYPES = void 0;

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireDefault(require("react"));

var _classnames = _interopRequireDefault(require("classnames"));

var _button_icon = require("./button_icon/button_icon");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var accessibleIconButton = function accessibleIconButton(props, propName, componentName) {
  if (props.children) {
    return;
  }

  if (props['aria-label']) {
    return;
  }

  if (props['aria-labelledby']) {
    return;
  }

  throw new Error("".concat(componentName, " requires aria-label or aria-labelledby to be specified if it does not have children. ") + "This is because we're assuming you're creating an icon-only button, which is screen-reader-inaccessible.");
};

var BUTTON_TYPES = ['basic', 'hollow', 'danger', 'warning', 'primary', 'secondary'];
exports.BUTTON_TYPES = BUTTON_TYPES;
var ICON_POSITIONS = ['left', 'right'];
var DEFAULT_ICON_POSITION = 'left';
var buttonTypeToClassNameMap = {
  basic: 'kuiButton--basic',
  hollow: 'kuiButton--hollow',
  danger: 'kuiButton--danger',
  warning: 'kuiButton--warning',
  primary: 'kuiButton--primary',
  secondary: 'kuiButton--secondary'
};

var getClassName = function getClassName(_ref) {
  var className = _ref.className,
      buttonType = _ref.buttonType,
      _ref$hasIcon = _ref.hasIcon,
      hasIcon = _ref$hasIcon === void 0 ? false : _ref$hasIcon;
  return (0, _classnames.default)('kuiButton', className, buttonTypeToClassNameMap[buttonType], {
    'kuiButton--iconText': hasIcon
  });
};

var ContentWithIcon = function ContentWithIcon(_ref2) {
  var children = _ref2.children,
      icon = _ref2.icon,
      iconPosition = _ref2.iconPosition,
      isLoading = _ref2.isLoading;
  var iconOrLoading = isLoading ? _react.default.createElement(_button_icon.KuiButtonIcon, {
    type: "loading"
  }) : icon; // We need to wrap the children so that the icon's :first-child etc. pseudo-selectors get applied
  // correctly.

  var wrappedChildren = children ? _react.default.createElement("span", null, children) : undefined;

  switch (iconPosition) {
    case 'left':
      return _react.default.createElement("span", {
        className: "kuiButton__inner"
      }, iconOrLoading, wrappedChildren);

    case 'right':
      return _react.default.createElement("span", {
        className: "kuiButton__inner"
      }, wrappedChildren, iconOrLoading);
  }
};

var KuiButton = function KuiButton(_ref3) {
  var isLoading = _ref3.isLoading,
      _ref3$iconPosition = _ref3.iconPosition,
      iconPosition = _ref3$iconPosition === void 0 ? DEFAULT_ICON_POSITION : _ref3$iconPosition,
      className = _ref3.className,
      buttonType = _ref3.buttonType,
      icon = _ref3.icon,
      children = _ref3.children,
      rest = _objectWithoutProperties(_ref3, ["isLoading", "iconPosition", "className", "buttonType", "icon", "children"]);

  return _react.default.createElement("button", _extends({
    className: getClassName({
      className: className,
      buttonType: buttonType,
      hasIcon: icon || isLoading
    })
  }, rest), _react.default.createElement(ContentWithIcon, {
    icon: icon,
    iconPosition: iconPosition,
    isLoading: isLoading
  }, children));
};

exports.KuiButton = KuiButton;
KuiButton.propTypes = {
  icon: _propTypes.default.node,
  iconPosition: _propTypes.default.oneOf(ICON_POSITIONS),
  children: _propTypes.default.node,
  isLoading: _propTypes.default.bool,
  buttonType: _propTypes.default.oneOf(BUTTON_TYPES),
  className: _propTypes.default.string,
  'aria-label': accessibleIconButton
};

var KuiLinkButton = function KuiLinkButton(_ref4) {
  var isLoading = _ref4.isLoading,
      icon = _ref4.icon,
      _ref4$iconPosition = _ref4.iconPosition,
      iconPosition = _ref4$iconPosition === void 0 ? DEFAULT_ICON_POSITION : _ref4$iconPosition,
      className = _ref4.className,
      disabled = _ref4.disabled,
      buttonType = _ref4.buttonType,
      children = _ref4.children,
      rest = _objectWithoutProperties(_ref4, ["isLoading", "icon", "iconPosition", "className", "disabled", "buttonType", "children"]);

  var onClick = function onClick(e) {
    if (disabled) {
      e.preventDefault();
    }
  };

  var classes = (0, _classnames.default)(getClassName({
    className: className,
    buttonType: buttonType,
    hasIcon: icon || isLoading
  }), {
    'kuiButton-isDisabled': disabled
  });
  return _react.default.createElement("a", _extends({
    className: classes,
    onClick: onClick
  }, rest), _react.default.createElement(ContentWithIcon, {
    icon: icon,
    iconPosition: iconPosition,
    isLoading: isLoading
  }, children));
};

exports.KuiLinkButton = KuiLinkButton;
KuiLinkButton.propTypes = {
  icon: _propTypes.default.node,
  iconPosition: _propTypes.default.oneOf(ICON_POSITIONS),
  isLoading: _propTypes.default.bool,
  buttonType: _propTypes.default.oneOf(BUTTON_TYPES),
  className: _propTypes.default.string,
  children: _propTypes.default.node,
  'aria-label': accessibleIconButton
};

var KuiSubmitButton = function KuiSubmitButton(_ref5) {
  var className = _ref5.className,
      buttonType = _ref5.buttonType,
      children = _ref5.children,
      rest = _objectWithoutProperties(_ref5, ["className", "buttonType", "children"]);

  // NOTE: The `input` element is a void element and can't contain children.
  return _react.default.createElement("input", _extends({
    type: "submit",
    value: children,
    className: getClassName({
      className: className,
      buttonType: buttonType
    })
  }, rest));
};

exports.KuiSubmitButton = KuiSubmitButton;
KuiSubmitButton.propTypes = {
  children: _propTypes.default.string,
  buttonType: _propTypes.default.oneOf(BUTTON_TYPES),
  className: _propTypes.default.string
};
