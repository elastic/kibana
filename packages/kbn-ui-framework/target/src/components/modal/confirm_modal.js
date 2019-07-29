"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiConfirmModal = KuiConfirmModal;
exports.CANCEL_BUTTON = exports.CONFIRM_BUTTON = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

var _modal = require("./modal");

var _modal_footer = require("./modal_footer");

var _modal_header = require("./modal_header");

var _modal_header_title = require("./modal_header_title");

var _modal_body = require("./modal_body");

var _components = require("../../components/");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

var CONFIRM_BUTTON = 'confirm';
exports.CONFIRM_BUTTON = CONFIRM_BUTTON;
var CANCEL_BUTTON = 'cancel';
exports.CANCEL_BUTTON = CANCEL_BUTTON;
var CONFIRM_MODAL_BUTTONS = [CONFIRM_BUTTON, CANCEL_BUTTON];

function KuiConfirmModal(_ref) {
  var children = _ref.children,
      title = _ref.title,
      onCancel = _ref.onCancel,
      onConfirm = _ref.onConfirm,
      cancelButtonText = _ref.cancelButtonText,
      confirmButtonText = _ref.confirmButtonText,
      className = _ref.className,
      defaultFocusedButton = _ref.defaultFocusedButton,
      rest = _objectWithoutProperties(_ref, ["children", "title", "onCancel", "onConfirm", "cancelButtonText", "confirmButtonText", "className", "defaultFocusedButton"]);

  var classes = (0, _classnames.default)('kuiModal--confirmation', className);
  var modalTitle;

  if (title) {
    modalTitle = _react.default.createElement(_modal_header.KuiModalHeader, null, _react.default.createElement(_modal_header_title.KuiModalHeaderTitle, {
      "data-test-subj": "confirmModalTitleText"
    }, title));
  }

  var message;

  if (typeof children === 'string') {
    message = _react.default.createElement("p", {
      className: "kuiText"
    }, children);
  } else {
    message = children;
  }

  return _react.default.createElement(_modal.KuiModal, _extends({
    className: classes,
    onClose: onCancel
  }, rest), modalTitle, _react.default.createElement(_modal_body.KuiModalBody, null, _react.default.createElement("div", {
    "data-test-subj": "confirmModalBodyText"
  }, message)), _react.default.createElement(_modal_footer.KuiModalFooter, null, _react.default.createElement(_components.KuiButton, {
    buttonType: "hollow",
    autoFocus: defaultFocusedButton === CANCEL_BUTTON,
    "data-test-subj": "confirmModalCancelButton",
    onClick: onCancel
  }, cancelButtonText), _react.default.createElement(_components.KuiButton, {
    buttonType: "primary",
    autoFocus: defaultFocusedButton === CONFIRM_BUTTON,
    "data-test-subj": "confirmModalConfirmButton",
    onClick: onConfirm
  }, confirmButtonText)));
}

KuiConfirmModal.propTypes = {
  children: _propTypes.default.node,
  title: _propTypes.default.string,
  cancelButtonText: _propTypes.default.string,
  confirmButtonText: _propTypes.default.string,
  onCancel: _propTypes.default.func.isRequired,
  onConfirm: _propTypes.default.func,
  className: _propTypes.default.string,
  defaultFocusedButton: _propTypes.default.oneOf(CONFIRM_MODAL_BUTTONS)
};
