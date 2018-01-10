import { uiModules } from 'ui/modules';

// disable the kibana state management
const app = uiModules.get('apps/canvas');
app.config(stateManagementConfigProvider => {
  stateManagementConfigProvider.disable();
});
