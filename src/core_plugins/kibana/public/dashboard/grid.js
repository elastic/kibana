import _ from 'lodash';
import $ from 'jquery';
import Binder from 'ui/binder';
import 'gridster';
import uiModules from 'ui/modules';
import { PanelUtils } from 'plugins/kibana/dashboard/panel/panel_utils';
import { getPersistedStateId } from 'plugins/kibana/dashboard/panel/panel_state';

const app = uiModules.get('app/dashboard');

app.directive('dashboardGrid', function ($compile, Notifier) {
  return {
    restrict: 'E',
    require: '^dashboardApp', // must inherit from the dashboardApp
    link: function ($scope, $el) {
      const notify = new Notifier();
      const $container = $el;
      $el = $('<ul>').appendTo($container);

      const $window = $(window);
      const binder = new Binder($scope);

      // appState from controller
      const $state = $scope.state;

      let gridster; // defined in init()

      // number of columns to render
      const COLS = 12;
      // number of pixed between each column/row
      const SPACER = 0;
      // pixels used by all of the spacers (gridster puts have a spacer on the ends)
      const spacerSize = SPACER * COLS;

      // debounced layout function is safe to call as much as possible
      const safeLayout = _.debounce(layout, 200);

      $scope.removePanelFromState = (panelIndex) => {
        _.remove($scope.state.panels, function (panel) {
          return panel.panelIndex === panelIndex;
        });
      };

      /**
       * Removes the panel with the given index from the $scope.state.panels array. Does not
       * remove the ui element from gridster - that is triggered by a watcher that is
       * triggered on changes made to $scope.state.panels.
       * @param panelIndex {number}
       */
      $scope.getPanelByPanelIndex = (panelIndex) => {
        return _.find($scope.state.panels, function (panel) {
          return panel.panelIndex === panelIndex;
        });
      };

      function init() {
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
            handle: '.panel-move, .fa-arrows',
            stop: readGridsterChangeHandler
          }
        }).data('gridster');

        // This is necessary to enable text selection within gridster elements
        // http://stackoverflow.com/questions/21561027/text-not-selectable-from-editable-div-which-is-draggable
        binder.jqOn($el, 'mousedown', function () {
          gridster.disable().disable_resize();
        });
        binder.jqOn($el, 'mouseup', function enableResize() {
          gridster.enable().enable_resize();
        });

        $scope.$watchCollection('state.panels', function (panels) {
          const currentPanels = gridster.$widgets.toArray().map(function (el) {
            return getPanelFor(el);
          });

          // panels that are now missing from the panels array
          const removed = _.difference(currentPanels, panels);

          // panels that have been added
          const added = _.difference(panels, currentPanels);

          if (removed.length) removed.forEach(removePanel);
          if (added.length) {
            // See issue https://github.com/elastic/kibana/issues/2138 and the
            // subsequent fix for why we need to sort here. Short story is that
            // gridster can fail to render widgets in the correct order, depending
            // on the specific order of the panels.
            // See https://github.com/ducksboard/gridster.js/issues/147
            // for some additional back story.
            added.sort((a, b) => {
              if (a.row === b.row) {
                return a.col - b.col;
              } else {
                return a.row - b.row;
              }
            });

            added.forEach(addPanel);
          };

          // ensure that every panel can be serialized now that we are done
          $state.panels.forEach(PanelUtils.makeSerializeable);

          // alert interested parties that we have finished processing changes to the panels
          // TODO: change this from event based to calling a method on dashboardApp
          if (added.length || removed.length) $scope.$root.$broadcast('change:vis');
        });

        $scope.$on('$destroy', function () {
          safeLayout.cancel();
          $window.off('resize', safeLayout);

          if (!gridster) return;
          gridster.$widgets.each(function (i, el) {
            const panel = getPanelFor(el);
            // stop any animations
            panel.$el.stop();
            removePanel(panel, true);
            // not that we will, but lets be safe
            PanelUtils.makeSerializeable(panel);
          });
        });

        safeLayout();
        $window.on('resize', safeLayout);
        $scope.$on('ready:vis', safeLayout);
        $scope.$on('globalNav:update', safeLayout);
      }

      // return the panel object for an element.
      //
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      // ALWAYS CALL PanelUtils.makeSerializeable AFTER YOU ARE DONE WITH IT
      // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      function getPanelFor(el) {
        const $panel = el.jquery ? el : $(el);
        const panel = $panel.data('panel');
        panel.$el = $panel;
        return panel;
      }

      // Tell gridster to remove the panel, and cleanup our metadata
      function removePanel(panel, silent) {
        // remove from grister 'silently' (don't reorganize after)
        gridster.remove_widget(panel.$el, silent);
        panel.$el.removeData('panel');
        $scope.uiState.removeChild(getPersistedStateId(panel));
      }

      // tell gridster to add the panel, and create additional meatadata like $scope
      function addPanel(panel) {
        PanelUtils.initializeDefaults(panel);

        const panelHtml = `
            <li>
                <dashboard-panel
                  remove="removePanelFromState(${panel.panelIndex})"
                  panel="getPanelByPanelIndex(${panel.panelIndex})"
                  is-full-screen-mode="!chrome.getVisible()"
                  is-expanded="false"
                  get-vis-click-handler="filterBarClickHandler(state)"
                  get-vis-brush-handler="brushEvent(state)"
                  save-state="state.save()"
                  toggle-expand="toggleExpandPanel(${panel.panelIndex})"
                  create-child-ui-state="createChildUiState(path, uiState)">
            </li>`;
        panel.$el = $compile(panelHtml)($scope);

        // tell gridster to use the widget
        gridster.add_widget(panel.$el, panel.size_x, panel.size_y, panel.col, panel.row);

        // Gridster may change the position of the widget when adding it, make sure the panel
        // contains the latest info.
        PanelUtils.refreshSizeAndPosition(panel);

        // stash the panel in the element's data
        panel.$el.data('panel', panel);
      }

      // when gridster tell us it made a change, update each of the panel objects
      function readGridsterChangeHandler(e, ui, $widget) {
        // ensure that our panel objects keep their size in sync
        gridster.$widgets.each(function (i, el) {
          const panel = getPanelFor(el);
          PanelUtils.refreshSizeAndPosition(panel);
          PanelUtils.makeSerializeable(panel);
          $scope.$root.$broadcast('change:vis');
        });
      }

      // calculate the position and sizing of the gridster el, and the columns within it
      // then tell gridster to "reflow" -- which is definitely not supported.
      // we may need to consider using a different library
      function reflowGridster() {
        // https://github.com/gcphost/gridster-responsive/blob/97fe43d4b312b409696b1d702e1afb6fbd3bba71/jquery.gridster.js#L1208-L1235
        const g = gridster;

        g.options.widget_margins = [SPACER / 2, SPACER / 2];
        g.options.widget_base_dimensions = [($container.width() - spacerSize) / COLS, 100];
        g.min_widget_width  = (g.options.widget_margins[0] * 2) + g.options.widget_base_dimensions[0];
        g.min_widget_height = (g.options.widget_margins[1] * 2) + g.options.widget_base_dimensions[1];

        g.$widgets.each(function (i, widget) {
          g.resize_widget($(widget));
        });

        g.generate_grid_and_stylesheet();
        g.generate_stylesheet({ namespace: '.gridster' });

        g.get_widgets_from_DOM();
        // We can't call this method if the gridmap is empty. This was found
        // when the user double clicked the "New Dashboard" icon. See
        // https://github.com/elastic/kibana4/issues/390
        if (gridster.gridmap.length > 0) g.set_dom_grid_height();
        g.drag_api.set_limits(COLS * g.min_widget_width);
      }

      function layout() {
        const complete = notify.event('reflow dashboard');
        reflowGridster();
        readGridsterChangeHandler();
        complete();
      }

      init();
    }
  };
});
