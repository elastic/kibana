"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiEmptyTablePrompt = KuiEmptyTablePrompt;

var _propTypes = _interopRequireDefault(require("prop-types"));

var _react = _interopRequireDefault(require("react"));

var _classnames = _interopRequireDefault(require("classnames"));

var _empty_table_prompt_message = require("./empty_table_prompt_message");

var _empty_table_prompt_actions = require("./empty_table_prompt_actions");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function KuiEmptyTablePrompt(_ref) {
  var actions = _ref.actions,
      message = _ref.message,
      className = _ref.className,
      rest = _objectWithoutProperties(_ref, ["actions", "message", "className"]);

  var classes = (0, _classnames.default)('kuiEmptyTablePrompt', className);
  return _react.default.createElement("div", _extends({
    className: classes
  }, rest), _react.default.createElement(_empty_table_prompt_message.KuiEmptyTablePromptMessage, null, message), _react.default.createElement(_empty_table_prompt_actions.KuiEmptyTablePromptActions, null, actions));
}

KuiEmptyTablePrompt.propTypes = {
  message: _propTypes.default.string.isRequired,
  actions: _propTypes.default.node,
  className: _propTypes.default.string
};
