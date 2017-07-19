import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { hashUrl } from 'ui/state_management/state_hashing';
import uiRoutes from 'ui/routes';

uiRoutes.enable();
uiRoutes
.when('/', {
  resolve: {
    url: function (AppState, globalState, $window) {
      const redirectUrl = chrome.getInjected('redirectUrl');

      const hashedUrl = hashUrl([new AppState(), globalState], redirectUrl);
      const url = chrome.addBasePath(hashedUrl);

      $window.location = url;
    }
  }
});
