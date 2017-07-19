import { uiModules } from 'ui/modules';
uiModules.get('kibana')
  .provider('dashboardConfig', () => {
    let hideWriteControls = false;

    return {
      /**
       * Part of the exposed plugin API - do not remove without careful consideration.
       * @type {boolean}
       */
      turnHideWriteControlsOn() {
        hideWriteControls = true;
      },
      $get() {
        return {
          getHideWriteControls() {
            return hideWriteControls;
          }
        };
      }
    };
  });
