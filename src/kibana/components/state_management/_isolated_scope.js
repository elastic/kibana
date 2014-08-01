define(function (require) {
  var _ = require('lodash');

  return function IsolatedScopeProvider($rootScope) {
    var Scope = $rootScope.constructor;

    _.inherits(IsolatedScope, Scope);
    function IsolatedScope() {

      IsolatedScope.Super.call(this);

      // Prepare the new scope and attach it to the rootScope's linked list
      this.$root = $rootScope.$root;
      // ensure that there is just one async queue per $rootScope and its children
      this.$$asyncQueue = $rootScope.$$asyncQueue;
      this.$$postDigestQueue = $rootScope.$$postDigestQueue;
      this['this'] = this;
      this.$parent = $rootScope;
      this.$$prevSibling = $rootScope.$$childTail;
      if ($rootScope.$$childHead) {
        $rootScope.$$childTail.$$nextSibling = this;
        $rootScope.$$childTail = this;
      } else {
        $rootScope.$$childHead = $rootScope.$$childTail = this;
      }
    }

    return IsolatedScope;

  };
});
