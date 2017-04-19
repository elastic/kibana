import { ResizeCheckerProvider } from 'ui/vislib/lib/resize_checker'

export function useResizeCheckerProvider(Private) {
  const ResizeChecker = Private(ResizeCheckerProvider);

  return function useResizeChecker($scope, $el, ...editors) {
    const checker = new ResizeChecker($el);
    checker.on('resize', () => editors.forEach(e => e.resize()));
    $scope.$on('$destroy', () => checker.destroy())
  }
}
