import { FieldFormatsService } from '../core_plugins/kibana/common/field_formats/field_formats';

export function fieldFormatsMixin(kbnServer, server) {
  server.decorate('server', 'fieldFormats', new FieldFormatsService);
}
