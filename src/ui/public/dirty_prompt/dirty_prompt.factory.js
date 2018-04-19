import { uiModules } from '../modules';
import { DirtyPrompt } from './dirty_prompt';

uiModules.get('kibana')
  .factory('dirtyPrompt', ($injector) => {
    const $window = $injector.get('$window');
    const confirmModal = $injector.get('confirmModal');
    const $rootScope = $injector.get('$rootScope');

    return new DirtyPrompt($window, $rootScope, confirmModal);
  });
