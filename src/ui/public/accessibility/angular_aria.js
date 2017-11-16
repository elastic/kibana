import 'angular-aria';
import { uiModules } from 'ui/modules';

uiModules
  .get('kibana', ['ngAria'])
  .config(($ariaProvider) => {
    $ariaProvider.config({
      bindKeydown: false,
      bindRoleForClick: false,
      tabindex: false,
    });
  });
