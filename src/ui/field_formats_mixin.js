import { FieldFormatsService } from '../core_plugins/kibana/common/field_formats/field_formats';
import { getUiSettingDefaults } from '../core_plugins/kibana/ui_setting_defaults';

export function fieldFormatsMixin(kbnServer, server) {
  server.decorate('server', 'uiSettingDefaults', getUiSettingDefaults());
  server.decorate('server', 'fieldFormats', new FieldFormatsService);
}
