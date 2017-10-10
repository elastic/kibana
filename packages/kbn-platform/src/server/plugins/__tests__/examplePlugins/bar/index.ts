import { KibanaPluginConfig } from '../../../../../server/plugins/types';
import { FooPluginType } from '../foo';

interface BarExports {
  fromFoo: FooPluginType['foo']['value'];
  value: string;
}

export interface BarPluginType {
  bar: BarExports;
}

export const plugin: KibanaPluginConfig<FooPluginType, BarExports> = {
  configPath: 'bar',
  dependencies: ['foo'],
  plugin: (kibana, deps) => {
    return {
      fromFoo: deps.foo.value,
      value: 'bar'
    };
  }
};
