import { uiModules } from 'ui/modules';
import advancedImportTemplate from 'plugins/kibana/management/sections/settings/advanced_import.html';
import { AdvancedImportState } from 'plugins/kibana/management/sections/settings/advanced_import_state.js';

uiModules.get('apps/management')
  .directive('advancedImport', function (config, Private) {
    const advancedImportState = Private(AdvancedImportState);

    const abandonSetting = setting => {
      config.set(setting.name, setting.oldValue);
      advancedImportState.markAsAbandoned(setting);
    };

    const importSetting = setting => {
      config.set(setting.name, setting.value);
      advancedImportState.markAsImported(setting);
    };

    return {
      restrict: 'E',
      replace: true,
      template: advancedImportTemplate,
      controllerAs: 'advancedImport',
      bindToController: true,
      controller: class AdvancedImportController {
        constructor() {
          this.importState = advancedImportState;
          this.importSetting = importSetting;
          this.abandonSetting = abandonSetting;
          this.importAllSettings = () => advancedImportState.getSettings().forEach(importSetting);
          this.abandonAllSettings = () => advancedImportState.getSettings().forEach(abandonSetting);

          this.done = () => {
            advancedImportState.clearSettings();
            advancedImportState.setImporting(false);
          };
        }
      }
    };
  });
