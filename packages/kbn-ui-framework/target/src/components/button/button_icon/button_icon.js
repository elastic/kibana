"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiButtonIcon = exports.ICON_TYPES = void 0;

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireDefault(require("react"));

var _classnames = _interopRequireDefault(require("classnames"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var ICON_TYPES = ['create', 'delete', 'previous', 'next', 'loading', 'settings', 'menu'];
exports.ICON_TYPES = ICON_TYPES;

var KuiButtonIcon = function KuiButtonIcon(props) {
  var typeToClassNameMap = {
    create: 'fa-plus',
    delete: 'fa-trash',
    previous: 'fa-chevron-left',
    next: 'fa-chevron-right',
    loading: 'fa-spinner fa-spin',
    settings: 'fa-gear',
    menu: 'fa-bars'
  };
  var iconClasses = (0, _classnames.default)('kuiButton__icon kuiIcon', props.className, _defineProperty({}, typeToClassNameMap[props.type], props.type)); // Purely decorative icons should be hidden from screen readers. Button icons are purely
  // decorate since assisted users will want to click on the button itself, not the icon within.
  // (https://www.w3.org/WAI/GL/wiki/Using_aria-hidden%3Dtrue_on_an_icon_font_that_AT_should_ignore)

  return _react.default.createElement("span", {
    "aria-hidden": "true",
    className: iconClasses
  });
};

exports.KuiButtonIcon = KuiButtonIcon;
KuiButtonIcon.propTypes = {
  type: _propTypes.default.oneOf(ICON_TYPES),
  className: _propTypes.default.string
};
