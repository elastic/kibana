
import modules from 'ui/modules';
import angular from 'angular';

modules.get('kibana')
.service('appSwitcherState', (localStorage, $rootScope) => {
  return {
    isOpen: () => {
      return localStorage.get('kibana.iAppSwitcherOpen');
    },

    setOpen: isOpen => {
      localStorage.set('kibana.iAppSwitcherOpen', isOpen);
      $rootScope.$broadcast('appSwitcherState:change');
      return isOpen;
    }
  };
});
