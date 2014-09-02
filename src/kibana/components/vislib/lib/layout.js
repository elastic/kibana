define(function (require) {
  return function LayoutFactory(d3, Private) {
    var _ = require('lodash');

    var layoutType = Private(require('components/vislib/layout_types'));

    /*
    * The Layout Constructor is responsible for rendering the visualization
    * layout, which includes all the DOM div elements.
    * Input:
    *   1. DOM div - parent element for which the layout is attached
    *   2. data - data is bound to the div element
    *   3. chartType (e.g. 'histogram') - specifies the layout type to grab
    */
    function Layout(el, data, chartType) {
      if (!(this instanceof Layout)) {
        return new Layout(el, data, chartType);
      }

      this.el = el;
      this.data = data;
      this.layoutType = layoutType[chartType](el, data);
    }

    Layout.prototype.render = function () {
      // Remove all elements from the current visualization
      this.removeAll(this.el);

      // Create the layout
      this.createLayout(this.layoutType);
    };

    // Accepts the layoutType array
    Layout.prototype.createLayout = function (arr) {
      var self = this;

      // for each object in the layout array, calls the layout function on it
      return _(arr).forEach(function (obj) {
        self.layout(obj);
      });
    };

    // Appends a DOM element based on the object keys
    Layout.prototype.layout = function (obj) {
      if (!obj.parent) {
        throw new Error('No parent element provided');
      }

      if (!obj.type) {
        throw new Error('No element type provided');
      }

      if (typeof obj.type !== 'string') {
        throw new Error(obj.type + ' must be a string');
      }

      if (typeof obj.parent === 'string') {
        obj.parent = '.' + obj.parent;
      }

      var el = this.appendElem(obj.parent, obj.type, obj.class);

      if (obj.datum) {
        el.datum(obj.datum);
      }

      if (obj.splits) {
        d3.select('.' + obj.class).call(obj.splits);
      }

      if (obj.children) {
        this.createLayout(obj.children);
      }

      return el;
    };

    // Appends a `type` of DOM element to `el` and gives it a class attribute `elClass`
    Layout.prototype.appendElem = function (el, type, className) {
      if (!el || !type || !className) {
        throw new Error('Function requires that an el, type, and class be provided');
      }
      return d3.select(el).append(type)
        .attr('class', className);
    };

    // Removes all DOM elements from `el`
    Layout.prototype.removeAll = function (el) {
      return d3.select(el).selectAll('*').remove();
    };

    return Layout;
  };
});
