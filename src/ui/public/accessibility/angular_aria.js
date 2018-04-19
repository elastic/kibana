import 'angular-aria';
import { uiModules } from '../modules';

/**
 * This module will take care of attaching appropriate aria tags related to some angular stuff,
 * e.g. it will attach aria-invalid if the model state is set to invalid.
 *
 * You can find more infos in the official documentation: https://docs.angularjs.org/api/ngAria.
 *
 * Three settings are disabled: it won't automatically attach `tabindex`, `role=button` or
 * handling keyboad events for `ngClick` directives. Kibana uses `kbnAccessibleClick` to handle
 * those cases where you need an `ngClick` non button element to have keyboard access.
 */
uiModules
  .get('kibana', ['ngAria'])
  .config(($ariaProvider) => {
    $ariaProvider.config({
      bindKeydown: false,
      bindRoleForClick: false,
      tabindex: false,
    });
  });
