export type PluginName = string;
export type PluginConfigPath = string | string[];

export type PluginsType = {
  [pluginName: string]: any;
};

export abstract class KibanaPlugin<C, D extends PluginsType, E = void> {
  constructor(readonly kibana: C, readonly deps: D) {}

  abstract start(): E;

  stop() {
    // default implementation of stop does nothing
  }
}

/**
 * Defines the "static side" of the Kibana class plugin.
 *
 * When a class implements an interface, only the instance side of the class is
 * checked, so you can't include static methods there. Because of that we have
 * a separate interface for the static side, which we can use to specify that we
 * want a _class_ (not an instance) that matches this interface.
 *
 * See https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes
 */
export interface KibanaClassPluginStatic<C, D extends PluginsType, E = void> {
  new (kibana: C, deps: D): KibanaPlugin<C, D, E>;
}
