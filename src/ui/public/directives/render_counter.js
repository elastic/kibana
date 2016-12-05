import uiModules from 'ui/modules';

uiModules
  .get('kibana')
  .directive('renderCounter', () => ({
    controller($scope, $element) {
      let counter = 0;

      const increment = () => {
        counter += 1;
        $element.attr('render-counter', counter);
      };

      const teardown = () => {
        $element.off('renderComplete', increment);
      };

      const setup = () => {
        $element.attr('render-counter', counter);
        $element.on('renderComplete', increment);
        $scope.$on('$destroy', teardown);
      };

      this.disable = () => {
        $element.attr('render-counter', 'disabled');
        teardown();
      };

      setup();
    }
  }));
