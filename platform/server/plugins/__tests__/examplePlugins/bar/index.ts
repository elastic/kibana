import { KibanaFunctionalPlugin } from '../../../../../server/plugins/types';
import { FooPluginType } from '../foo';

export const dependencies = ['foo'];

interface BarExports {
  fromFoo: FooPluginType['foo']['value'];
  value: string;
}

export interface BarPluginType {
  bar: BarExports;
}

export const plugin: KibanaFunctionalPlugin<FooPluginType, BarExports> = (kibana, deps) => {
  return {
    fromFoo: deps.foo.value,
    value: 'bar'
  }
}
