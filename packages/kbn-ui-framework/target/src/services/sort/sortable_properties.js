"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SortableProperties = void 0;

var _lodash = _interopRequireDefault(require("lodash"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/**
 * @typedef {Object} SortableProperty
 * @property {string} sortableProperty.name - Name of the property.
 * @property {function} sortableProperty.getValue - A function that takes in an object and returns a value to sort
 * by.
 * @property {boolean} sortableProperty.isAscending - The direction of the last sort by this property. Used to preserve
 * past sort orders.
 */

/**
 * Stores sort information for a set of SortableProperties, including which property is currently being sorted on, as
 * well as the last sort order for each property.
 */
var SortableProperties =
/*#__PURE__*/
function () {
  /**
   * @param {Array<SortableProperty>} sortableProperties - a set of sortable properties.
   * @param {string} initialSortablePropertyName - Which sort property should be sorted on by default.
   */
  function SortableProperties(sortableProperties, initialSortablePropertyName) {
    _classCallCheck(this, SortableProperties);

    this.sortableProperties = sortableProperties;
    /**
     * The current property that is being sorted on.
     * @type {SortableProperty}
     */

    this.currentSortedProperty = this.getSortablePropertyByName(initialSortablePropertyName);

    if (!this.currentSortedProperty) {
      throw new Error("No property with the name ".concat(initialSortablePropertyName));
    }
  }
  /**
   * @returns {SortableProperty} The current property that is being sorted on. Undefined if no sort order is applied.
   */


  _createClass(SortableProperties, [{
    key: "getSortedProperty",
    value: function getSortedProperty() {
      return this.currentSortedProperty;
    }
    /**
     * Sorts the items passed in and returns a newly sorted array.
     * @param items {Array.<Object>}
     * @returns {Array.<Object>} sorted array of items, based off the sort properties.
     */

  }, {
    key: "sortItems",
    value: function sortItems(items) {
      return this.isCurrentSortAscending() ? _lodash.default.sortBy(items, this.getSortedProperty().getValue) : _lodash.default.sortBy(items, this.getSortedProperty().getValue).reverse();
    }
    /**
     * Returns the SortProperty with the given name, if found.
     * @param {String} propertyName
     * @returns {SortableProperty|undefined}
     */

  }, {
    key: "getSortablePropertyByName",
    value: function getSortablePropertyByName(propertyName) {
      return this.sortableProperties.find(function (property) {
        return property.name === propertyName;
      });
    }
    /**
     * Updates the sort property, potentially flipping the sort order based on whether the same
     * property was already being sorted.
     * @param propertyName {String}
     */

  }, {
    key: "sortOn",
    value: function sortOn(propertyName) {
      var newSortedProperty = this.getSortablePropertyByName(propertyName);
      var sortedProperty = this.getSortedProperty();

      if (sortedProperty.name === newSortedProperty.name) {
        this.flipCurrentSortOrder();
      } else {
        this.currentSortedProperty = newSortedProperty;
      }
    }
    /**
     * @returns {boolean} True if the current sortable property is sorted in ascending order.
     */

  }, {
    key: "isCurrentSortAscending",
    value: function isCurrentSortAscending() {
      var sortedProperty = this.getSortedProperty();
      return sortedProperty ? this.isAscendingByName(sortedProperty.name) : false;
    }
    /**
     * @param {string} propertyName
     * @returns {boolean} True if the given sort property is sorted in ascending order.
     */

  }, {
    key: "isAscendingByName",
    value: function isAscendingByName(propertyName) {
      var sortedProperty = this.getSortablePropertyByName(propertyName);
      return sortedProperty ? sortedProperty.isAscending : false;
    }
    /**
     * Flips the current sorted property sort order.
     */

  }, {
    key: "flipCurrentSortOrder",
    value: function flipCurrentSortOrder() {
      this.currentSortedProperty.isAscending = !this.currentSortedProperty.isAscending;
    }
  }]);

  return SortableProperties;
}();

exports.SortableProperties = SortableProperties;
