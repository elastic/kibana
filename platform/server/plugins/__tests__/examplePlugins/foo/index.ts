import { KibanaPluginConfig } from '../../../../../server/plugins/types';

interface FooExports {
  value: string;
}

export interface FooPluginType {
  foo: FooExports;
}

export const plugin: KibanaPluginConfig<{}, FooExports> = {
  configPath: 'foo',
  plugin: kibana => {
    return {
      value: 'foo'
    };
  }
};
