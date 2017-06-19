import { KibanaFunctionalPlugin } from '../../../../../server/plugins/types';

export const dependencies = [];

interface FooExports {
  value: string
}

export interface FooPluginType {
  foo: FooExports
}

export const plugin: KibanaFunctionalPlugin<{}, FooExports> = kibana => {
  return {
    value: 'foo'
  }
}
