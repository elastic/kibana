import { KibanaPluginApi } from './KibanaPluginApi';

export type PluginName = string;
export type PluginConfigPath = string | string[];

export interface BasePluginsType {
  [key: string]: any;
}

export type KibanaPluginConfig<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> = {
  configPath?: PluginConfigPath;
  dependencies?: PluginName[];
  plugin:
    | KibanaFunctionalPlugin<DependenciesType, ExposableType>
    | KibanaClassPluginStatic<DependenciesType, ExposableType>;
};

/**
 *
 */
export type KibanaFunctionalPlugin<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> = (kibana: KibanaPluginApi, plugins: DependenciesType) => ExposableType;

/**
 * Defines the "static side" of the Kibana class plugin.
 *
 * When a class implements an interface, only the instance side of the class is
 * checked, so you can't include static methods there. Because of that we have
 * a seprate interface for the static side, which we can use to specify that we
 * want a _class_ (not an instance) that matches this interface.
 *
 * See https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes
 */
export interface KibanaClassPluginStatic<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> {
  new (kibana: KibanaPluginApi, plugins: DependenciesType): KibanaClassPlugin<
    ExposableType
  >;
}

/**
 * The interface for an instance of a Kibana class plugin.
 */
export interface KibanaClassPlugin<ExposableType> {
  start(): ExposableType;

  stop?(): void;
}
