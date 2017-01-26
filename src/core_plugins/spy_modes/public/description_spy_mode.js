import _ from 'lodash';
import descriptionSpyModeTemplate from 'plugins/spy_modes/description_spy_mode.html';

require('ui/registry/spy_modes')
.register(function () {
  return {
    name: 'description',
    display: 'Description',
    order: 0,
    template: descriptionSpyModeTemplate,
  };
});