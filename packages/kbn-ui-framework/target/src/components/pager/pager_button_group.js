"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiPagerButtonGroup = KuiPagerButtonGroup;

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireDefault(require("react"));

var _button = require("../button");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function KuiPagerButtonGroup(_ref) {
  var className = _ref.className,
      onPrevious = _ref.onPrevious,
      onNext = _ref.onNext,
      hasNext = _ref.hasNext,
      hasPrevious = _ref.hasPrevious,
      rest = _objectWithoutProperties(_ref, ["className", "onPrevious", "onNext", "hasNext", "hasPrevious"]);

  return _react.default.createElement(_button.KuiButtonGroup, _extends({
    isUnited: true,
    className: className
  }, rest), _react.default.createElement(_button.KuiButton, {
    "aria-label": "Show previous page",
    "data-test-subj": "pagerPreviousButton",
    buttonType: "basic",
    onClick: onPrevious,
    disabled: !hasPrevious,
    icon: _react.default.createElement(_button.KuiButtonIcon, {
      type: "previous"
    })
  }), _react.default.createElement(_button.KuiButton, {
    "aria-label": "Show next page",
    "data-test-subj": "pagerNextButton",
    buttonType: "basic",
    onClick: onNext,
    disabled: !hasNext,
    icon: _react.default.createElement(_button.KuiButtonIcon, {
      type: "next"
    })
  }));
}

KuiPagerButtonGroup.propTypes = {
  onPrevious: _propTypes.default.func.isRequired,
  onNext: _propTypes.default.func.isRequired,
  hasNext: _propTypes.default.bool.isRequired,
  hasPrevious: _propTypes.default.bool.isRequired,
  className: _propTypes.default.string
};
