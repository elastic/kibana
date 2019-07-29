"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiPopover = exports.ANCHOR_POSITIONS = void 0;

var _react = _interopRequireWildcard(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _classnames = _interopRequireDefault(require("classnames"));

var _focusTrapReact = _interopRequireDefault(require("focus-trap-react"));

var _tabbable = _interopRequireDefault(require("tabbable"));

var _services = require("../../services");

var _outside_click_detector = require("../outside_click_detector");

var _panel_simple = require("../../components/panel_simple");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var anchorPositionToClassNameMap = {
  'center': '',
  'left': 'kuiPopover--anchorLeft',
  'right': 'kuiPopover--anchorRight'
};
var ANCHOR_POSITIONS = Object.keys(anchorPositionToClassNameMap);
exports.ANCHOR_POSITIONS = ANCHOR_POSITIONS;

var KuiPopover =
/*#__PURE__*/
function (_Component) {
  _inherits(KuiPopover, _Component);

  function KuiPopover(props) {
    var _this;

    _classCallCheck(this, KuiPopover);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(KuiPopover).call(this, props));

    _defineProperty(_assertThisInitialized(_this), "onKeyDown", function (e) {
      if (e.keyCode === _services.cascadingMenuKeyCodes.ESCAPE) {
        _this.props.closePopover();
      }
    });

    _defineProperty(_assertThisInitialized(_this), "panelRef", function (node) {
      if (_this.props.ownFocus) {
        _this.panel = node;
      }
    });

    _this.closingTransitionTimeout = undefined;
    _this.state = {
      isClosing: false,
      isOpening: false
    };
    return _this;
  }

  _createClass(KuiPopover, [{
    key: "updateFocus",
    value: function updateFocus() {
      var _this2 = this;

      // Wait for the DOM to update.
      window.requestAnimationFrame(function () {
        if (!_this2.panel) {
          return;
        } // If we've already focused on something inside the panel, everything's fine.


        if (_this2.panel.contains(document.activeElement)) {
          return;
        } // Otherwise let's focus the first tabbable item and expedite input from the user.


        var tabbableItems = (0, _tabbable.default)(_this2.panel);

        if (tabbableItems.length) {
          tabbableItems[0].focus();
        }
      });
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      this.updateFocus();
    }
  }, {
    key: "componentWillReceiveProps",
    value: function componentWillReceiveProps(nextProps) {
      var _this3 = this;

      // The popover is being opened.
      if (!this.props.isOpen && nextProps.isOpen) {
        clearTimeout(this.closingTransitionTimeout); // We need to set this state a beat after the render takes place, so that the CSS
        // transition can take effect.

        window.requestAnimationFrame(function () {
          _this3.setState({
            isOpening: true
          });
        });
      } // The popover is being closed.


      if (this.props.isOpen && !nextProps.isOpen) {
        // If the user has just closed the popover, queue up the removal of the content after the
        // transition is complete.
        this.setState({
          isClosing: true,
          isOpening: false
        });
        this.closingTransitionTimeout = setTimeout(function () {
          _this3.setState({
            isClosing: false
          });
        }, 250);
      }
    }
  }, {
    key: "componentDidUpdate",
    value: function componentDidUpdate() {
      this.updateFocus();
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      clearTimeout(this.closingTransitionTimeout);
    }
  }, {
    key: "render",
    value: function render() {
      var _this4 = this;

      var _this$props = this.props,
          anchorPosition = _this$props.anchorPosition,
          button = _this$props.button,
          isOpen = _this$props.isOpen,
          ownFocus = _this$props.ownFocus,
          withTitle = _this$props.withTitle,
          children = _this$props.children,
          className = _this$props.className,
          closePopover = _this$props.closePopover,
          panelClassName = _this$props.panelClassName,
          panelPaddingSize = _this$props.panelPaddingSize,
          rest = _objectWithoutProperties(_this$props, ["anchorPosition", "button", "isOpen", "ownFocus", "withTitle", "children", "className", "closePopover", "panelClassName", "panelPaddingSize"]);

      var classes = (0, _classnames.default)('kuiPopover', anchorPositionToClassNameMap[anchorPosition], className, {
        'kuiPopover-isOpen': this.state.isOpening,
        'kuiPopover--withTitle': withTitle
      });
      var panelClasses = (0, _classnames.default)('kuiPopover__panel', panelClassName);
      var panel;

      if (isOpen || this.state.isClosing) {
        var tabIndex;
        var initialFocus;

        if (ownFocus) {
          tabIndex = '0';

          initialFocus = function initialFocus() {
            return _this4.panel;
          };
        }

        panel = _react.default.createElement(_focusTrapReact.default, {
          focusTrapOptions: {
            clickOutsideDeactivates: true,
            initialFocus: initialFocus
          }
        }, _react.default.createElement(_panel_simple.KuiPanelSimple, {
          panelRef: this.panelRef,
          className: panelClasses,
          paddingSize: panelPaddingSize,
          tabIndex: tabIndex,
          hasShadow: true
        }, children));
      }

      return _react.default.createElement(_outside_click_detector.KuiOutsideClickDetector, {
        onOutsideClick: closePopover
      }, _react.default.createElement("div", _extends({
        className: classes,
        onKeyDown: this.onKeyDown
      }, rest), button, panel));
    }
  }]);

  return KuiPopover;
}(_react.Component);

exports.KuiPopover = KuiPopover;
KuiPopover.propTypes = {
  isOpen: _propTypes.default.bool,
  ownFocus: _propTypes.default.bool,
  withTitle: _propTypes.default.bool,
  closePopover: _propTypes.default.func.isRequired,
  button: _propTypes.default.node.isRequired,
  children: _propTypes.default.node,
  anchorPosition: _propTypes.default.oneOf(ANCHOR_POSITIONS),
  panelClassName: _propTypes.default.string,
  panelPaddingSize: _propTypes.default.oneOf(_panel_simple.SIZES)
};
KuiPopover.defaultProps = {
  isOpen: false,
  ownFocus: false,
  anchorPosition: 'center',
  panelPaddingSize: 'm'
};
