import { ResizeChecker } from 'ui/resize_checker'

export function useResizeChecker($scope, $el, ...editors) {
  const checker = new ResizeChecker($el);
  checker.on('resize', () => editors.forEach(e => e.resize()));
  $scope.$on('$destroy', () => checker.destroy())
}
