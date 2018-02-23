import { uiModules } from 'ui/modules';

// disable angular's location provider
const app = uiModules.get('apps/canvas');
app.config($locationProvider => {
  $locationProvider.html5Mode({
    enabled: false,
    requireBase: false,
    rewriteLinks: false,
  });
});
