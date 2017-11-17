import { ResizeCheckerProvider } from 'ui/resize_checker';
import { dashboardContextProvider } from 'plugins/kibana/dashboard/dashboard_context';
import { VegaView } from './vega_view';

import hjson from 'hjson';
import compactStringify from 'json-stringify-pretty-compact';

export function createVegaVisController(Private, /*$scope,*/ timefilter, es, serviceSettings) {
  const ResizeChecker = Private(ResizeCheckerProvider);
  const dashboardContext = Private(dashboardContextProvider);

  class VegaVisController {

    messages = [];

    /**
     * If the 2nd array parameter in args exists, append it to the warning/error string value
     */
    static expandError(value, args) {
      if (args.length >= 2) {
        try {
          if (typeof args[1] === 'string') {
            value += `\n${args[1]}`;
          } else {
            value += '\n' + compactStringify(args[1], { maxLength: 70 });
          }
        } catch (err) {
          // ignore
        }
      }
      return value;
    }

    onError(error) {
      if (!error) {
        error = 'ERR';
      } else if (error instanceof Error) {
        if (console && console.log) console.log(error);
        error = error.message;
      }

      this.messages.push({ type: 'error', data: VegaVisController.expandError(error, arguments) });
    }

    onWarn(warning) {
      this.messages.push({ type: 'warning', data: VegaVisController.expandError(warning, arguments) });
    }

    link($scope, $el/*, $attr*/) {
      const resizeChecker = new ResizeChecker($el);

      const onResize = () => {
        resizeChecker.modifySizeWithoutTriggeringResize(() => this.vegaView && this.vegaView.resize());
      };

      const createGraph = async () => {
        this.messages = [];

        // FIXME!!  need to debounce editor changes

        try {
          const spec = hjson.parse($scope.vega.vis.params.spec);
          if (this.vegaView) {
            await this.vegaView.destroy();
          }
          this.vegaView = new VegaView($el, spec, timefilter, dashboardContext, es, serviceSettings,
            this.onError.bind(this), this.onWarn.bind(this));
          await this.vegaView.init();
        } catch (error) {
          this.onError(error);
        }

        onResize();
      };

      $scope.timefilter = timefilter;
      $scope.$watchMulti(
        [
          '=vega.vis.params',
          '=timefilter',
          'vega.visData'
        ],
        createGraph
      );
      $scope.$on('courier:searchRefresh', createGraph);
      // resizeChecker.on('resize', onResize);

      $scope.$on('$destroy', () => {
        this.vegaView.destroy().catch(error => this.onError(error));
      });
    }
  }

  return new VegaVisController();
}
