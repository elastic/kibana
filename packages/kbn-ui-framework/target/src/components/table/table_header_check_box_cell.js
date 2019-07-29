"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiTableHeaderCheckBoxCell = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

var _table_header_cell = require("./table_header_cell");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var KuiTableHeaderCheckBoxCell = function KuiTableHeaderCheckBoxCell(_ref) {
  var onChange = _ref.onChange,
      isChecked = _ref.isChecked,
      className = _ref.className,
      rest = _objectWithoutProperties(_ref, ["onChange", "isChecked", "className"]);

  var classes = (0, _classnames.default)('kuiTableHeaderCell--checkBox', className);
  return _react.default.createElement(_table_header_cell.KuiTableHeaderCell, _extends({
    className: classes
  }, rest), _react.default.createElement("input", {
    type: "checkbox",
    className: "kuiCheckBox",
    onChange: onChange,
    checked: isChecked,
    "aria-label": "".concat(isChecked ? 'Deselect' : 'Select', " all rows")
  }));
};

exports.KuiTableHeaderCheckBoxCell = KuiTableHeaderCheckBoxCell;
KuiTableHeaderCheckBoxCell.propTypes = {
  isChecked: _propTypes.default.bool,
  onChange: _propTypes.default.func,
  className: _propTypes.default.string
};
