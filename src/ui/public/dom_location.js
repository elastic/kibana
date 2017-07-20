export function DomLocationProvider($window) {
  return {
    reload: function (forceFetch) {
      $window.location.reload(forceFetch);
    },

    get href() {
      return $window.location.href;
    },

    set href(val) {
      return ($window.location.href = val);
    }
  };
}
