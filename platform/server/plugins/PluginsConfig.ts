import { Schema, typeOfSchema } from '../../types/schema';
import { Env } from '../../config';

const createPluginsSchema = (schema: Schema) =>
  schema.object({
    scanDirs: schema.arrayOf(schema.string(), {
      defaultValue: []
    })
  });

const pluginsConfigType = typeOfSchema(createPluginsSchema);
type PluginsConfigType = typeof pluginsConfigType;

export class PluginsConfig {
  /**
   * @internal
   */
  static createSchema = createPluginsSchema;

  // Defines all directories where we will scan for plugins
  readonly scanDirs: string[];

  /**
   * @internal
   */
  constructor(config: PluginsConfigType, env: Env) {
    this.scanDirs = [env.corePluginsDir, ...config.scanDirs];
  }
}
