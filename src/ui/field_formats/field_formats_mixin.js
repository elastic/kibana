import _ from 'lodash';
import { FieldFormatsService } from './field_formats_service';
import { FieldFormat } from './field_format';

export function fieldFormatsMixin(kbnServer, server) {
  const fieldFormatClasses = [];

  // for use outside of the request context, for special cases
  server.decorate('server', 'fieldFormatServiceFactory', async function (uiSettings) {
    const uiConfigs = await uiSettings.getAll();
    const uiSettingDefaults = await uiSettings.getDefaults();
    Object.keys(uiSettingDefaults).forEach((key) => {
      if (_.has(uiConfigs, key) && uiSettingDefaults[key].type === 'json') {
        uiConfigs[key] = JSON.parse(uiConfigs[key]);
      }
    });
    const getConfig = (key) => uiConfigs[key];
    return new FieldFormatsService(fieldFormatClasses, getConfig);
  });

  server.decorate('server', 'registerFieldFormat', (createFormat) => {
    fieldFormatClasses.push(createFormat(FieldFormat));
  });
}
