define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('gridster');

  var app = require('modules').get('app/dashboard');

  app.directive('dashboardGrid', function ($compile, Notifier) {
    return {
      restrict: 'E',
      require: '^dashboardApp', // must inherit from the dashboardApp
      link: function ($scope, $el) {
        var notify = new Notifier();
        var $container = $el;
        $el = $('<ul>').appendTo($container);

        var $window = $(window);
        var $body = $(document.body);

        // appState from controller
        var $state = $scope.state;

        var gridster; // defined in init()

        // number of columns to render
        var COLS = 12;
        // number of pixed between each column/row
        var SPACER = 10;
        // pixels used by all of the spacers (gridster puts have a spacer on the ends)
        var spacerSize = SPACER * COLS;

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
              handle: '.panel-heading, .panel-title',
              stop: readGridsterChangeHandler
            }
          }).data('gridster');

          $scope.$watchCollection('state.panels', function (panels) {
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
            // TODO: change this from event based to calling a method on dashboardApp
            if (added.length || removed.length) $scope.$root.$broadcast('change:vis');
          });

          $scope.$on('$destroy', function () {
            $window.off('resize', safeLayout);

            if (!gridster) return;
            gridster.$widgets.each(function (i, el) {
              var panel = getPanelFor(el);
              removePanel(panel);
              // stop any animations
              panel.$el.stop();
              // not that we will, but lets be safe
              makePanelSerializeable(panel);
            });
          });
          safeLayout();
          $window.on('resize', safeLayout);
          $scope.$on('ready:vis', safeLayout);
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
          gridster.remove_widget(panel.$el);

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
            panel.$scope.$broadcast('resize');
            makePanelSerializeable(panel);
            $scope.$root.$broadcast('change:vis');
          });
        };

        // calculate the position and sizing of the gridster el, and the columns within it
        // then tell gridster to "reflow" -- which is definitely not supported.
        // we may need to consider using a different library
        var reflowGridster = function () {
          // https://github.com/gcphost/gridster-responsive/blob/97fe43d4b312b409696b1d702e1afb6fbd3bba71/jquery.gridster.js#L1208-L1235
          var g = gridster;

          g.options.widget_margins = [SPACER / 2, SPACER / 2];
          g.options.widget_base_dimensions = [($container.width() - spacerSize) / COLS, 100];
          g.min_widget_width  = (g.options.widget_margins[0] * 2) + g.options.widget_base_dimensions[0];
          g.min_widget_height = (g.options.widget_margins[1] * 2) + g.options.widget_base_dimensions[1];

          // var serializedGrid = g.serialize();
          g.$widgets.each(function (i, widget) {
            g.resize_widget($(widget));
          });

          g.generate_grid_and_stylesheet();
          g.generate_stylesheet({ namespace: '.gridster' });

          g.get_widgets_from_DOM();
          // We can't call this method if the gridmap is empty. This was found
          // when the user double clicked the "New Dashboard" icon. See
          // https://github.com/elasticsearch/kibana4/issues/390
          if (gridster.gridmap.length > 0) g.set_dom_grid_height();
          g.drag_api.set_limits(COLS * g.min_widget_width);
        };

        var layout = function () {
          var complete = notify.event('reflow dashboard');
          reflowGridster();
          readGridsterChangeHandler();
          complete();
        };

        var safeLayout = _.debounce(layout, 200);

        init();
      }
    };
  });

});
