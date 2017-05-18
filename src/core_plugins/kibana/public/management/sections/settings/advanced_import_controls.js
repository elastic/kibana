import { uiModules } from 'ui/modules';
import { saveAs } from '@spalger/filesaver';
import { AdvancedImportState } from 'plugins/kibana/management/sections/settings/advanced_import_state.js';
import advancedImportControlsTemplate from 'plugins/kibana/management/sections/settings/advanced_import_controls.html';

uiModules.get('apps/management')
  .directive('advancedImportControls', function (config, Notifier, Private) {
    const notify = new Notifier({ location: 'Advanced Settings' });
    const advancedImportState = Private(AdvancedImportState);

    return {
      restrict: 'E',
      template: advancedImportControlsTemplate,
      link: function ($scope) {
        $scope.importState = advancedImportState;

        $scope.export = () => {
          const all = config.getAll();
          // Construct an object with keys that have user-defined values and values
          // set to those user-defined values
          const userValues = Object.keys(all).reduce((values, configKey) => {
            const configObj = all[configKey];
            // Readonly objects are not configurable, so skip
            if (configObj.hasOwnProperty('userValue') && !configObj.readonly) {
              values[configKey] = configObj.userValue;
            }
            return values;
          }, {});
          const blob = new Blob([JSON.stringify(userValues)], { type: 'application/json' });
          saveAs(blob, 'settings-export.json');
        };

        $scope.import = (fileContents) => {
          let settings;
          try {
            settings = JSON.parse(fileContents);
          } catch (e) {
            notify.error('The file could not be processed.');
            return;
          }

          advancedImportState.clearSettings();

          const allConfig = config.getAll();
          Object.keys(settings).forEach(settingName => {
            const setting = settings[settingName];
            const isValid = allConfig.hasOwnProperty(settingName);
            if (isValid) {
              // Do not bother showing if they imported values match the current values
              if (setting === config.get(settingName)) {
                return;
              } else if (JSON.stringify(setting) === JSON.stringify(config.get(settingName))) {
                return;
              }
            }

            const importedSetting = advancedImportState.addSetting(
              settingName,
              setting,
              config.get(settingName),
              allConfig[settingName],
              isValid
            );

            // By default, import everything
            config.set(settingName, setting);
            advancedImportState.markAsImported(importedSetting);
          });

          advancedImportState.setImporting(true);
        };
      }
    };
  });
