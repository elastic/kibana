import { Schema, typeOfSchema } from 'kbn-types';

const createReportingSchema = (schema: Schema) =>
  schema.object({
    enabled: schema.boolean({
      defaultValue: true
    }),
    encryptionKey: schema.string()
  });

const reportingConfigType = typeOfSchema(createReportingSchema);

export class ReportingConfig {
  static createSchema = createReportingSchema;

  enabled: boolean;
  encryptionKey: string;

  constructor(config: typeof reportingConfigType) {
    this.enabled = config.enabled;
    this.encryptionKey = config.encryptionKey;
  }
}
