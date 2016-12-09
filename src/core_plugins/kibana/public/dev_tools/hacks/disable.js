import chrome from 'ui/chrome';
import modules from 'ui/modules';

modules.get('kibana').run(function ($rootScope, $location) {
  if (!chrome.getInjected('esDataIsTribe')) {
    return;
  }
  const navLink = chrome.getNavLinkById('kibana:dev_tools');
  navLink.disabled = true;
  navLink.tooltip = 'Dev Tools are disabled when using tribe nodes';
  $rootScope.$on('$locationChangeStart', function (event, newUrl) {
    if (~newUrl.indexOf(navLink.url)) {
      $location.path('/').replace();
    }
  });
});
