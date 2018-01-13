import { schema } from '@elastic/kbn-sdk';
import { Env } from '../../config';

const pluginsSchema = schema.object({
  scanDirs: schema.arrayOf(schema.string(), {
    defaultValue: []
  })
});

type PluginsConfigType = schema.TypeOf<typeof pluginsSchema>;

export class PluginsConfig {
  /**
   * @internal
   */
  static schema = pluginsSchema;

  // Defines all directories where we will scan for plugins
  readonly scanDirs: string[];

  /**
   * @internal
   */
  constructor(config: PluginsConfigType, env: Env) {
    this.scanDirs = [env.corePluginsDir, ...config.scanDirs];
  }
}
