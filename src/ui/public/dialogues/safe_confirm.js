import uiModules from 'ui/modules';
uiModules.get('kibana')

/*
 * Angular doesn't play well with thread blocking calls such as
 * unless those calls are specifically handled inside a call
 * to $timeout(). Rather than litter the code with that implementation
 * detail, safeConfirm() can be used.
 *
 * WARNING: safeConfirm only blocks the thread beginning on the next tick. For that reason, a
 * promise is returned so consumers can handle the control flow.
 *
 * Usage:
 *  safeConfirm('This message will be shown in a modal dialog').then(
 *    function () {
 *      // user clicked the okay button
 *    },
 *    function () {
 *      // user canceled the confirmation
 *    }
 *  );
 */
.factory('safeConfirm', function ($window, $timeout, $q, showConfirmDialogue) {
  return function safeConfirm(message) {
    return $timeout(function () {
      return showConfirmDialogue(message) || $q.reject(false);
    });
  };
});
