import { uiModules } from 'ui/modules';
import { TermsVis } from './components/terms_vis';

const module = uiModules.get('kibana/terms_vis', ['kibana', 'react']);
module.controller('KbnTermsController', function () {

});

module.value('TermsVis', TermsVis);