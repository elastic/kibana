export type SystemName = string;
export interface ISystemMetadata {
  [key: string]: any;
}

export interface ISystemsType {
  [systemName: string]: any;
}

export abstract class KibanaSystem<C, D extends ISystemsType, E = void> {
  constructor(readonly kibana: C, readonly deps: D) {}

  public abstract start(): E;

  public stop() {
    // default implementation of stop does nothing
  }
}

/**
 * Defines the "static side" of the Kibana system class.
 *
 * When a class implements an interface, only the instance side of the class is
 * checked, so you can't include static methods there. Because of that we have
 * a separate interface for the static side, which we can use to specify that we
 * want a _class_ (not an instance) that matches this interface.
 *
 * See https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes
 */
export interface IKibanaSystemClassStatic<C, D extends ISystemsType, E = void> {
  new (kibana: C, deps: D): KibanaSystem<C, D, E>;
}
