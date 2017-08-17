import { uiModules } from 'ui/modules';

import { decorateFormController } from './kbn_form_controller';

uiModules
.get('kibana')
.config(function ($provide) {
  $provide.decorator('formDirective', decorateFormController);
  $provide.decorator('ngFormDirective', decorateFormController);
});
