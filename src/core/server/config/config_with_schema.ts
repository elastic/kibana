// TODO inline all of these
import { AnyType, TypeOf } from './schema';
import { Env } from './env';

/**
 * Interface that defines the static side of a config class.
 *
 * (Remember that a class has two types: the type of the static side and the
 * type of the instance side, see https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes)
 *
 * This can't be used to define the config class because of how interfaces work
 * in TypeScript, but it can be used to ensure we have a config class that
 * matches whenever it's used.
 */
export interface ConfigWithSchema<S extends AnyType, Config> {
  /**
   * Any config class must define a schema that validates the config, based on
   * the injected `schema` helper.
   */
  schema: S;

  /**
   * @param validatedConfig The result of validating the static `schema` above.
   * @param env An instance of the `Env` class that defines environment specific
   * variables.
   */
  new (validatedConfig: TypeOf<S>, env: Env): Config;
}
