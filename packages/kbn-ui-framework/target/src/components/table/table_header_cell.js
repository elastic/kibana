"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiTableHeaderCell = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

var _services = require("../../services");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var KuiTableHeaderCell = function KuiTableHeaderCell(_ref) {
  var children = _ref.children,
      onSort = _ref.onSort,
      isSorted = _ref.isSorted,
      isSortAscending = _ref.isSortAscending,
      className = _ref.className,
      ariaLabel = _ref.ariaLabel,
      align = _ref.align,
      scope = _ref.scope,
      rest = _objectWithoutProperties(_ref, ["children", "onSort", "isSorted", "isSortAscending", "className", "ariaLabel", "align", "scope"]);

  var classes = (0, _classnames.default)('kuiTableHeaderCell', className, {
    'kuiTableHeaderCell--alignRight': align === _services.RIGHT_ALIGNMENT
  });

  if (onSort) {
    var sortIconClasses = (0, _classnames.default)('kuiTableSortIcon kuiIcon', {
      'fa-long-arrow-up': isSortAscending,
      'fa-long-arrow-down': !isSortAscending
    });

    var sortIcon = _react.default.createElement("span", {
      className: sortIconClasses,
      "aria-hidden": "true"
    });

    var buttonClasses = (0, _classnames.default)('kuiTableHeaderCellButton', {
      'kuiTableHeaderCellButton-isSorted': isSorted
    });
    var columnTitle = ariaLabel ? ariaLabel : children;
    var statefulAriaLabel = "Sort ".concat(columnTitle, " ").concat(isSortAscending ? 'descending' : 'ascending');
    return _react.default.createElement("th", _extends({
      className: classes,
      scope: scope
    }, rest), _react.default.createElement("button", {
      className: buttonClasses,
      onClick: onSort,
      "aria-label": statefulAriaLabel
    }, _react.default.createElement("span", {
      className: "kuiTableHeaderCell__liner"
    }, children, sortIcon)));
  }

  return _react.default.createElement("th", _extends({
    className: classes,
    "aria-label": ariaLabel,
    scope: scope
  }, rest), _react.default.createElement("div", {
    className: "kuiTableHeaderCell__liner"
  }, children));
};

exports.KuiTableHeaderCell = KuiTableHeaderCell;
KuiTableHeaderCell.propTypes = {
  children: _propTypes.default.node,
  className: _propTypes.default.string,
  onSort: _propTypes.default.func,
  isSorted: _propTypes.default.bool,
  isSortAscending: _propTypes.default.bool,
  align: _propTypes.default.oneOf([_services.LEFT_ALIGNMENT, _services.RIGHT_ALIGNMENT]),
  scope: _propTypes.default.oneOf(['col', 'row', 'colgroup', 'rowgroup'])
};
KuiTableHeaderCell.defaultProps = {
  align: _services.LEFT_ALIGNMENT,
  scope: 'col'
};
