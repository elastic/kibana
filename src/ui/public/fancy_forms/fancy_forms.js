import { uiModules } from '../modules';

import { decorateFormController } from './kbn_form_controller';
import { decorateModelController } from './kbn_model_controller';

uiModules
  .get('kibana')
  .config(function ($provide) {
    $provide.decorator('formDirective', decorateFormController);
    $provide.decorator('ngFormDirective', decorateFormController);
    $provide.decorator('ngModelDirective', decorateModelController);
  });
