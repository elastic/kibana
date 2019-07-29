"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiPager = KuiPager;

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireDefault(require("react"));

var _classnames = _interopRequireDefault(require("classnames"));

var _pager_button_group = require("./pager_button_group");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function KuiPager(_ref) {
  var className = _ref.className,
      startNumber = _ref.startNumber,
      endNumber = _ref.endNumber,
      totalItems = _ref.totalItems,
      hasPreviousPage = _ref.hasPreviousPage,
      hasNextPage = _ref.hasNextPage,
      onNextPage = _ref.onNextPage,
      onPreviousPage = _ref.onPreviousPage,
      rest = _objectWithoutProperties(_ref, ["className", "startNumber", "endNumber", "totalItems", "hasPreviousPage", "hasNextPage", "onNextPage", "onPreviousPage"]);

  var classes = (0, _classnames.default)('kuiPager', className);
  return _react.default.createElement("div", _extends({
    className: classes
  }, rest), _react.default.createElement("div", {
    className: "kuiPagerText"
  }, startNumber, "\u2013", endNumber, " of ", totalItems), startNumber === 1 && endNumber === totalItems ? null : _react.default.createElement(_pager_button_group.KuiPagerButtonGroup, {
    hasNext: hasNextPage,
    hasPrevious: hasPreviousPage,
    onNext: onNextPage,
    onPrevious: onPreviousPage
  }));
}

KuiPager.propTypes = {
  startNumber: _propTypes.default.number.isRequired,
  endNumber: _propTypes.default.number.isRequired,
  totalItems: _propTypes.default.number.isRequired,
  hasPreviousPage: _propTypes.default.bool.isRequired,
  hasNextPage: _propTypes.default.bool.isRequired,
  onNextPage: _propTypes.default.func.isRequired,
  onPreviousPage: _propTypes.default.func.isRequired,
  className: _propTypes.default.string
};
