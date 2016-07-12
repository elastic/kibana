
import modules from 'ui/modules';
import angular from 'angular';

modules.get('kibana')
.service('appSwitcherState', localStorage => {
  return {
    isOpen: () => {
      return localStorage.get('kibana.iAppSwitcherOpen');
    },

    setOpen: isOpen => {
      return localStorage.set('kibana.iAppSwitcherOpen', isOpen);
    }
  };
});
