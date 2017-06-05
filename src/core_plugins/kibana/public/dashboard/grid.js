import _ from 'lodash';
import $ from 'jquery';
import { Binder } from 'ui/binder';
import chrome from 'ui/chrome';
import 'gridster';
import { uiModules } from 'ui/modules';
import { DashboardViewMode } from 'plugins/kibana/dashboard/dashboard_view_mode';
import { PanelUtils } from 'plugins/kibana/dashboard/panel/panel_utils';

const app = uiModules.get('app/dashboard');

app.directive('dashboardGrid', function ($compile, Notifier) {
  return {
    restrict: 'E',
    scope: {
      /**
       * What view mode the dashboard is currently in - edit or view only.
       * @type {DashboardViewMode}
       */
      dashboardViewMode: '=',
      /**
       * Used to create a child persisted state for the panel from parent state.
       * @type {function} - Returns a {PersistedState} child uiState for this scope.
       */
      createChildUiState: '=',
      /**
       * Registers an index pattern with the dashboard app used by each panel. The index patterns are used by the
       * filter bar for generating field suggestions.
       * @type {function(IndexPattern)}
       */
      registerPanelIndexPattern: '=',
      /**
       * Trigger after a panel has been removed from the grid.
       */
      onPanelRemoved: '=',
      /**
       * Contains information about this panel.
       * @type {Array<PanelState>}
       */
      panels: '=',
      /**
       * Returns a click handler for a visualization.
       * @type {function}
       */
      getVisClickHandler: '=',
      /**
       * Returns a brush event handler for a visualization.
       * @type {function}
       */
      getVisBrushHandler: '=',
      /**
       * Call when changes should be propagated to the url and thus saved in state.
       * @type {function}
       */
      saveState: '=',
      /**
       * Expand or collapse a panel, so it either takes up the whole screen or goes back to its
       * natural size.
       * @type {function}
       */
      toggleExpand: '=',
    },
    link: function ($scope, $el) {
      const notify = new Notifier();
      const $container = $el;
      $el = $('<ul>').appendTo($container);

      const $window = $(window);
      const binder = new Binder($scope);

      let gridster; // defined in init()

      // number of columns to render
      const COLS = 12;
      // number of pixed between each column/row
      const SPACER = 0;
      // pixels used by all of the spacers (gridster puts have a spacer on the ends)
      const spacerSize = SPACER * COLS;

      // debounced layout function is safe to call as much as possible
      const safeLayout = _.debounce(layout, 200);
      /**
       * Mapping of panelIndex to the angular element in the grid.
       */
      const panelElementMapping = {};

      // Tell gridster to remove the panel, and cleanup our metadata
      function removePanelFromGrid(panelIndex, silent) {
        const panelElement = panelElementMapping[panelIndex];
        // remove from grister 'silently' (don't reorganize after)
        gridster.remove_widget(panelElement, silent);
        delete panelElementMapping[panelIndex];
      }

      $scope.removePanel = (panelIndex) => {
        removePanelFromGrid(panelIndex);
        $scope.onPanelRemoved(panelIndex);
      };

      $scope.findPanelByPanelIndex = PanelUtils.findPanelByPanelIndex;
      $scope.isFullScreenMode = !chrome.getVisible();

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
            handle: '[data-dashboard-panel-drag-handle]',
            stop: readGridsterChangeHandler
          }
        }).data('gridster');

        function setResizeCapability() {
          if ($scope.dashboardViewMode === DashboardViewMode.VIEW) {
            gridster.disable_resize();
          } else {
            gridster.enable_resize();
          }
        }

        // This is necessary to enable text selection within gridster elements
        // http://stackoverflow.com/questions/21561027/text-not-selectable-from-editable-div-which-is-draggable
        binder.jqOn($el, 'mousedown', function () {
          gridster.disable().disable_resize();
        });
        binder.jqOn($el, 'mouseup', function enableResize() {
          gridster.enable();
          setResizeCapability();
        });

        $scope.$watch('dashboardViewMode', () => {
          setResizeCapability();
        });

        $scope.$watchCollection('panels', function (panels) {
          const currentPanels = gridster.$widgets.toArray().map(
            el => {
              const panel = PanelUtils.findPanelByPanelIndex(el.panelIndex, $scope.panels);
              if (panel) {
                // A panel may have had its state updated, refresh gridster with the latest values.
                const panelElement = panelElementMapping[panel.panelIndex];
                PanelUtils.refreshElementSizeAndPosition(panel, panelElement);
                return panel;
              } else {
                return { panelIndex: el.panelIndex };
              }
            }
          );

          // Panels in the grid that are missing from the panels array. This can happen if the url is modified, and a
          // panel is manually removed.
          const removed = _.difference(currentPanels, panels);
          // Panels that have been added.
          const added = _.difference(panels, currentPanels);

          removed.forEach(panel => $scope.removePanel(panel.panelIndex));

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
          }

          if (added.length || removed.length) {
            $scope.saveState();
          }
          layout();
        });

        $scope.$on('$destroy', function () {
          safeLayout.cancel();
          $window.off('resize', safeLayout);

          if (!gridster) return;
          gridster.$widgets.each(function (i, widget) {
            const panelElement = panelElementMapping[widget.panelIndex];
            // stop any animations
            panelElement.stop();
            removePanelFromGrid(widget.panelIndex, true);
          });
        });

        safeLayout();
        $window.on('resize', safeLayout);
        $scope.$on('ready:vis', safeLayout);
        $scope.$on('globalNav:update', safeLayout);
      }

      // tell gridster to add the panel, and create additional meatadata like $scope
      function addPanel(panel) {
        PanelUtils.initializeDefaults(panel);
        const panelHtml = `
            <li>
                <dashboard-panel
                  remove="removePanel(${panel.panelIndex})"
                  panel="findPanelByPanelIndex(${panel.panelIndex}, panels)"
                  is-full-screen-mode="isFullScreenMode"
                  is-expanded="false"
                  dashboard-view-mode="dashboardViewMode"
                  get-vis-click-handler="getVisClickHandler"
                  get-vis-brush-handler="getVisBrushHandler"
                  save-state="saveState"
                  register-panel-index-pattern="registerPanelIndexPattern"
                  toggle-expand="toggleExpand(${panel.panelIndex})"
                  create-child-ui-state="createChildUiState">
            </li>`;
        const panelElement = $compile(panelHtml)($scope);
        panelElementMapping[panel.panelIndex] = panelElement;
        // Store the panelIndex on the widget so it can be used to retrieve the panelElement
        // from the mapping.
        panelElement[0].panelIndex = panel.panelIndex;

        // tell gridster to use the widget
        gridster.add_widget(panelElement, panel.size_x, panel.size_y, panel.col, panel.row);

        // Gridster may change the position of the widget when adding it, make sure the panel
        // contains the latest info.
        PanelUtils.refreshSizeAndPosition(panel, panelElement);
      }

      // When gridster tell us it made a change, update each of the panel objects
      function readGridsterChangeHandler() {
        // ensure that our panel objects keep their size in sync
        gridster.$widgets.each(function (i, widget) {
          const panel = PanelUtils.findPanelByPanelIndex(widget.panelIndex, $scope.panels);
          const panelElement = panelElementMapping[panel.panelIndex];
          PanelUtils.refreshSizeAndPosition(panel, panelElement);
        });

        $scope.saveState();
      }

      // calculate the position and sizing of the gridster el, and the columns within it
      // then tell gridster to "reflow" -- which is definitely not supported.
      // we may need to consider using a different library
      function reflowGridster() {
        if ($container.hasClass('ng-hide')) {
          return;
        }

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
