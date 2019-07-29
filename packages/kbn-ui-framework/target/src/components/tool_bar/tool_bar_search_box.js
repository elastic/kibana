"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiToolBarSearchBox = KuiToolBarSearchBox;

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireDefault(require("react"));

var _classnames = _interopRequireDefault(require("classnames"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function KuiToolBarSearchBox(_ref) {
  var defaultValue = _ref.defaultValue,
      filter = _ref.filter,
      onFilter = _ref.onFilter,
      placeholder = _ref.placeholder,
      className = _ref.className,
      rest = _objectWithoutProperties(_ref, ["defaultValue", "filter", "onFilter", "placeholder", "className"]);

  function onChange(event) {
    onFilter(event.target.value);
  }

  var classes = (0, _classnames.default)('kuiToolBarSearch', className);
  return _react.default.createElement("div", _extends({
    className: classes
  }, rest), _react.default.createElement("div", {
    className: "kuiToolBarSearchBox"
  }, _react.default.createElement("div", {
    className: "kuiToolBarSearchBox__icon kuiIcon fa-search"
  }), _react.default.createElement("input", {
    defaultValue: defaultValue,
    className: "kuiToolBarSearchBox__input",
    type: "text",
    placeholder: placeholder,
    "aria-label": "Filter",
    value: filter,
    onChange: onChange
  })));
}

KuiToolBarSearchBox.propTypes = {
  defaultValue: _propTypes.default.string,
  filter: _propTypes.default.string,
  onFilter: _propTypes.default.func.isRequired
};
KuiToolBarSearchBox.defaultProps = {
  placeholder: 'Search...'
};
