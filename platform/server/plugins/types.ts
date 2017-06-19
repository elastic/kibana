import { KibanaPluginFeatures } from '../../types';

export type PluginName = string;

export interface BasePluginsType {
  [key: string]: any;
}

export type KibanaFunctionalPlugin<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> = (
  kibana: KibanaPluginFeatures,
  plugins: DependenciesType
) => ExposableType;

// TODO We can't type the constructor, so we have no way of typing
// the `DependenciesType` in the same way as we do for `KibanaFunctionalPlugin`.
// UNLESS we create a class you can `import`, of course.
//
// From the TypeScript core team:
// > More formally, a class implementing an interface is a contract on what an
// > instance of the class has. Since an instance of a class won't contain a
// > construct signature, it cannot satisfy the interface.
//
// If we move these deps to `start` instead of the constructor there's another
// relevant issue regarding contextual typing, which means that all types must
// be explicitely listed in `start` in every plugin. See
// https://github.com/Microsoft/TypeScript/pull/10610 for a "dead-ish" WIP.
export interface KibanaPluginStatic<
  DependenciesType extends BasePluginsType,
  ExposableType = void
> {
  new (
    kibana: KibanaPluginFeatures,
    plugins: DependenciesType
  ): KibanaPlugin<ExposableType>
}

export interface KibanaPlugin<ExposableType> {
  start(): ExposableType;

  stop?(): void;
}
