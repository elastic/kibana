
import { uiModules } from 'ui/modules';

uiModules.get('kibana')
.service('globalNavState', (localStorage, $rootScope) => {
  return {
    isOpen: () => {
      const isOpen = localStorage.get('kibana.isGlobalNavOpen');
      if (isOpen === null) {
        // The global nav should default to being open for the initial experience.
        return true;
      }
      return isOpen;
    },

    setOpen: isOpen => {
      localStorage.set('kibana.isGlobalNavOpen', isOpen);
      $rootScope.$broadcast('globalNavState:change');
      return isOpen;
    }
  };
});
