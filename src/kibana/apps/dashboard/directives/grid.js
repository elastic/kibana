define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('gridster');
  require('css!../../../../bower_components/gridster/dist/jquery.gridster.css');

  var app = require('modules').get('app/dashboard');

  app.directive('dashboardGrid', function ($compile) {
    return {
      restrict: 'A',
      require: '^dashboardApp', // must inherit from the dashboardApp
      link: function ($scope, $el) {
        var $container = $el.parent();
        var $window = $(window);
        var $body = $(document.body);

        // appState from controller
        var $state = $scope.$state;

        var gridster; // defined in init()

        // number of columns to render
        var COLS = 12;
        // number of pixed between each column/row
        var SPACER = 10;

        var init = function () {
          $el.addClass('gridster');

          gridster = $el.gridster({
            max_cols: COLS,
            min_cols: COLS,
            autogenerate_stylesheet: false,
            resize: {
              enabled: true,
              stop: readGridsterChangeHandler
            },
            draggable: {
              stop: readGridsterChangeHandler
            }
          }).data('gridster');

          layout();
          var safeLayout = _.debounce(layout, 200);
          $window.on('resize', safeLayout);

          $scope.$watchCollection('$state.panels', function (panels) {
            var currentPanels = gridster.$widgets.toArray().map(function (el) {
              return getPanelFor(el);
            });

            // panels that are now missing from the panels array
            var removed = _.difference(currentPanels, panels);

            // panels that have been added
            var added = _.difference(panels, currentPanels);

            if (removed.length) removed.forEach(removePanel);
            if (added.length) added.forEach(addPanel);

            // ensure that every panel can be serialized now that we are done
            $state.panels.forEach(makePanelSerializeable);

            // alert interested parties that we have finished processing changes to the panels
            if (added.length || removed.length) $scope.$root.$broadcast('change:vis');
          });

          $scope.$on('$destroy', function () {
            $window.off('destroy', safeLayout);

            if (!gridster) return;
            gridster.$widgets.each(function (i, el) {
              removePanel(getPanelFor(el));
            });
          });
        };

        // return the panel object for an element.
        //
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        // ALWAYS CALL makePanelSerializeable AFTER YOU ARE DONE WITH IT
        // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        var getPanelFor = function (el) {
          var $el = el.jquery ? el : $(el);
          var panel = $el.data('panel');

          panel.$el = $el;
          panel.$scope = $el.data('$scope');

          return panel;
        };

        // since the $el and $scope are circular structures, they need to be
        // removed from panel before it can be serialized (we also wouldn't
        // want them to show up in the url)
        var makePanelSerializeable = function (panel) {
          delete panel.$el;
          delete panel.$scope;
        };

        // tell gridster to remove the panel, and cleanup our metadata
        var removePanel = function (panel) {
          // remove from grister 'silently' (don't reorganize after)
          gridster.remove_widget(panel.$el, true);

          // stop any animations
          panel.$el.stop();

          // destroy the scope
          panel.$scope.$destroy();

          panel.$el.removeData('panel');
          panel.$el.removeData('$scope');
        };

        // tell gridster to add the panel, and create additional meatadata like $scope
        var addPanel = function (panel) {
          _.defaults(panel, {
            size_x: 3,
            size_y: 2
          });

          // ignore panels that don't have vis id's
          if (!panel.visId) throw new Error('missing visId on panel');

          panel.$scope = $scope.$new();
          panel.$scope.panel = panel;

          panel.$el = $compile('<li><dashboard-panel></li>')(panel.$scope);

          // tell gridster to use the widget
          gridster.add_widget(panel.$el, panel.size_x, panel.size_y, panel.col, panel.row);

          // update size/col/etc.
          refreshPanelStats(panel);

          // stash the panel and it's scope in the element's data
          panel.$el.data('panel', panel);
          panel.$el.data('$scope', panel.$scope);
        };

        // ensure that the panel object has the latest size/pos info
        var refreshPanelStats = function (panel) {
          var data = panel.$el.coords().grid;
          panel.size_x = data.size_x;
          panel.size_y = data.size_y;
          panel.col = data.col;
          panel.row = data.row;
        };

        // when gridster tell us it made a change, update each of the panel objects
        var readGridsterChangeHandler = function (e, ui, $widget) {
          // ensure that our panel objects keep their size in sync
          gridster.$widgets.each(function (i, el) {
            var panel = getPanelFor(el);
            refreshPanelStats(panel);
            makePanelSerializeable(panel);
            $scope.$root.$broadcast('change:vis');
          });
        };

        // calculate the position and sizing of the gridster el, and the columns within it
        // then tell gridster to "reflow" -- which is definitely not supported.
        // we may need to consider using a different library
        var layout = function () {
          // pixels used by all of the spacers
          var spacerSize = SPACER * (COLS - 1);
          // horizontal padding on the container
          var horizPadding = parseInt($container.css('paddingLeft'), 10) + parseInt($container.css('paddingRight'), 10);

          // https://github.com/gcphost/gridster-responsive/blob/97fe43d4b312b409696b1d702e1afb6fbd3bba71/jquery.gridster.js#L1208-L1235

          var g = gridster;

          g.options.widget_margins = [SPACER / 2, SPACER / 2];
          g.options.widget_base_dimensions = [($container.width() - spacerSize - horizPadding) / COLS, 100];
          g.min_widget_width  = (g.options.widget_margins[0] * 2) + g.options.widget_base_dimensions[0];
          g.min_widget_height = (g.options.widget_margins[1] * 2) + g.options.widget_base_dimensions[1];

          // var serializedGrid = g.serialize();
          g.$widgets.each(function (i, widget) {
            g.resize_widget($(widget));
          });

          g.generate_grid_and_stylesheet();
          g.generate_stylesheet({ namespace: '.gridster' });

          g.get_widgets_from_DOM();
          g.set_dom_grid_height();
          g.drag_api.set_limits(COLS * g.min_widget_width);
        };

        init();
      }
    };
  });

});