export type SystemName = string;
export type SystemMetadata = {
  [key: string]: any;
};

export type SystemsType = {
  [systemName: string]: any;
};

export abstract class KibanaSystem<C, D extends SystemsType, E = void> {
  constructor(readonly kibana: C, readonly deps: D) {}

  abstract start(): E;

  stop() {
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
export interface KibanaSystemClassStatic<C, D extends SystemsType, E = void> {
  new (kibana: C, deps: D): KibanaSystem<C, D, E>;
}
