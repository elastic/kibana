import { KibanaPlugin } from '../../../../../server/plugins/types';

interface FooExports {
  value: string;
}

export interface FooPluginType {
  foo: FooExports;
}

export const plugin: KibanaPlugin<{}, FooExports> = {
  configPath: ['foo'],
  dependencies: [],
  plugin: kibana => {
    return {
      value: 'foo'
    };
  }
}
