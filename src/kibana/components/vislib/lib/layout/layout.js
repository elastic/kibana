define(function (require) {
  return function LayoutFactory(d3, Private) {
    var _ = require('lodash');

    var layoutType = Private(require('components/vislib/lib/layout/layout_types'));

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

    // Render the layout
    Layout.prototype.render = function () {
      // Remove all elements from the current visualization
      this.removeAll(this.el);

      // Create the layout
      this.createLayout(this.layoutType);
    };

    // Create the layout based on the json array provided
    Layout.prototype.createLayout = function (arr) {
      var self = this;

      // for each object in the layout array, call the layout function
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

      // check to see if reference to DOM element is string but not class selector
      if (typeof obj.parent === 'string' && obj.parent.charAt(0) !== '.') {
        // Create a class selector
        obj.parent = '.' + obj.parent;
      }

      // append child
      var childEl = this.appendElem(obj.parent, obj.type, obj.class);

      if (obj.datum) {
        // Bind datum to the element
        childEl.datum(obj.datum);
      }

      if (obj.splits) {
        // Call the split on its obj.class
        d3.select(this.el).select('.' + obj.class).call(obj.splits);
      }

      if (obj.children) {
        // Creating the parent elem for the child nodes
        var newParent = d3.select(this.el).select('.' + obj.class)[0][0];

        _.forEach(obj.children, function (obj) {
          if (!obj.parent) {
            obj.parent = newParent;
          }
        });

        // Recursively pass children to createLayout
        this.createLayout(obj.children);
      }

      return childEl;
    };

    // Appends a `type` of DOM element to `el` and gives it a class name attribute `className`
    Layout.prototype.appendElem = function (el, type, className) {
      if (!el || !type || !className) {
        throw new Error('Function requires that an el, type, and class be provided');
      }

      if (typeof el === 'string') {
        // Create a DOM reference with a d3 selection
        // Need to make sure that the `el` is bound to this object
        // to prevent it from being appended to another Layout
        el = d3.select(this.el).select(el)[0][0];
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
