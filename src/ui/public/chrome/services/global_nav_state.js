
import modules from 'ui/modules';
import angular from 'angular';

modules.get('kibana')
.service('globalNavState', (localStorage, $rootScope) => {
  return {
    isOpen: () => {
      return localStorage.get('kibana.isGlobalNavOpen');
    },

    setOpen: isOpen => {
      localStorage.set('kibana.isGlobalNavOpen', isOpen);
      $rootScope.$broadcast('globalNavState:change');
      return isOpen;
    }
  };
});
