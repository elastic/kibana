"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.KuiListingTable = KuiListingTable;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _lodash = _interopRequireDefault(require("lodash"));

var _listing_table_tool_bar = require("./listing_table_tool_bar");

var _listing_table_tool_bar_footer = require("./listing_table_tool_bar_footer");

var _listing_table_row = require("./listing_table_row");

var _index = require("../../index");

var _services = require("../../../services");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function KuiListingTable(_ref) {
  var rows = _ref.rows,
      header = _ref.header,
      pager = _ref.pager,
      toolBarActions = _ref.toolBarActions,
      onFilter = _ref.onFilter,
      onItemSelectionChanged = _ref.onItemSelectionChanged,
      enableSelection = _ref.enableSelection,
      selectedRowIds = _ref.selectedRowIds,
      filter = _ref.filter,
      prompt = _ref.prompt;

  function areAllRowsSelected() {
    return rows.length > 0 && rows.length === selectedRowIds.length;
  }

  function toggleAll() {
    if (areAllRowsSelected()) {
      onItemSelectionChanged([]);
    } else {
      onItemSelectionChanged(rows.map(function (row) {
        return row.id;
      }));
    }
  }

  function toggleRow(rowId) {
    var selectedRowIndex = selectedRowIds.indexOf(rowId);

    if (selectedRowIndex >= 0) {
      onItemSelectionChanged(selectedRowIds.filter(function (item, index) {
        return index !== selectedRowIndex;
      }));
    } else {
      onItemSelectionChanged([].concat(_toConsumableArray(selectedRowIds), [rowId]));
    }
  }

  function renderTableRows(enableSelection) {
    return rows.map(function (row, rowIndex) {
      return _react.default.createElement(_listing_table_row.KuiListingTableRow, {
        key: rowIndex,
        enableSelection: enableSelection,
        isSelected: selectedRowIds.indexOf(row.id) >= 0,
        onSelectionChanged: toggleRow,
        row: row
      });
    });
  }

  function renderHeader() {
    return header.map(function (cell, index) {
      var content = cell.content,
          props = _objectWithoutProperties(cell, ["content"]);

      if (_react.default.isValidElement(cell) || !_lodash.default.isObject(cell)) {
        props = [];
        content = cell;
      }

      return _react.default.createElement(_index.KuiTableHeaderCell, _extends({
        key: index
      }, props), content);
    });
  }

  function renderInnerTable() {
    return _react.default.createElement(_index.KuiTable, null, _react.default.createElement(_index.KuiTableHeader, null, enableSelection && _react.default.createElement(_index.KuiTableHeaderCheckBoxCell, {
      isChecked: areAllRowsSelected(),
      onChange: toggleAll
    }), renderHeader()), _react.default.createElement(_index.KuiTableBody, null, renderTableRows(enableSelection)));
  }

  return _react.default.createElement(_index.KuiControlledTable, null, _react.default.createElement(_listing_table_tool_bar.KuiListingTableToolBar, {
    actions: toolBarActions,
    pager: pager,
    onFilter: onFilter,
    filter: filter
  }), prompt ? prompt : renderInnerTable(), _react.default.createElement(_listing_table_tool_bar_footer.KuiListingTableToolBarFooter, {
    itemsSelectedCount: selectedRowIds.length,
    pager: pager
  }));
}

KuiListingTable.propTypes = {
  header: _propTypes.default.arrayOf(_propTypes.default.oneOfType([_propTypes.default.node, _propTypes.default.shape({
    content: _propTypes.default.node,
    align: _propTypes.default.oneOf([_services.LEFT_ALIGNMENT, _services.RIGHT_ALIGNMENT]),
    onSort: _propTypes.default.func,
    isSortAscending: _propTypes.default.bool,
    isSorted: _propTypes.default.bool
  })])),
  rows: _propTypes.default.arrayOf(_propTypes.default.shape({
    id: _propTypes.default.string,
    cells: _propTypes.default.arrayOf(_propTypes.default.oneOfType([_propTypes.default.node, _propTypes.default.shape({
      content: _propTypes.default.node,
      align: _propTypes.default.oneOf([_services.LEFT_ALIGNMENT, _services.RIGHT_ALIGNMENT])
    })]))
  })),
  pager: _propTypes.default.node,
  onItemSelectionChanged: _propTypes.default.func.isRequired,
  enableSelection: _propTypes.default.bool,
  selectedRowIds: _propTypes.default.array,
  prompt: _propTypes.default.node,
  // If given, will be shown instead of a table with rows.
  onFilter: _propTypes.default.func,
  toolBarActions: _propTypes.default.node,
  filter: _propTypes.default.string
};
KuiListingTable.defaultProps = {
  rows: [],
  selectedRowIds: [],
  enableSelection: true
};
