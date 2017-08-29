/**
 *  Creates a function that will be called on each route change
 *  to determine if the event should be used to update the last
 *  subUrl of chrome links/tabs
 *  @injected
 */
export function SubUrlRouteFilterProvider($injector) {
  if (!$injector.has('$route')) {
    return function alwaysUpdate() {
      return true;
    };
  }

  const $route = $injector.get('$route');
  return function ignoreRedirectToRoutes() {
    return Boolean($route.current && !$route.current.redirectTo);
  };
}
