"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiTableRowCell = exports.ALIGNMENT = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

var _services = require("../../services");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var ALIGNMENT = [_services.RIGHT_ALIGNMENT, _services.LEFT_ALIGNMENT];
exports.ALIGNMENT = ALIGNMENT;

var KuiTableRowCell = function KuiTableRowCell(_ref) {
  var children = _ref.children,
      align = _ref.align,
      className = _ref.className,
      textOnly = _ref.textOnly,
      rest = _objectWithoutProperties(_ref, ["children", "align", "className", "textOnly"]);

  var classes = (0, _classnames.default)('kuiTableRowCell', className, {
    'kuiTableRowCell--alignRight': align === _services.RIGHT_ALIGNMENT,
    // We're doing this rigamarole instead of creating kuiTabelRowCell--textOnly for BWC
    // purposes for the time-being.
    'kuiTableRowCell--overflowingContent': !textOnly
  });
  return _react.default.createElement("td", _extends({
    className: classes
  }, rest), _react.default.createElement("div", {
    className: "kuiTableRowCell__liner"
  }, children));
};

exports.KuiTableRowCell = KuiTableRowCell;
KuiTableRowCell.propTypes = {
  align: _propTypes.default.oneOf(ALIGNMENT),
  children: _propTypes.default.node,
  className: _propTypes.default.string,
  textOnly: _propTypes.default.bool
};
KuiTableRowCell.defaultProps = {
  align: _services.LEFT_ALIGNMENT,
  textOnly: true
};
