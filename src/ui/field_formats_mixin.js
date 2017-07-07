import { FieldFormatsService } from './field_formats/field_formats_service';

export function fieldFormatsMixin(kbnServer, server) {
  server.decorate('server', 'fieldFormats', new FieldFormatsService());
}
