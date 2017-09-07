/**
 * TypeScript's type system is structural, but for some use-cases we want to be
 * able to create "branded types", e.g. create two types `Id` and `PluginName`
 * and make sure we don't use one in place of the other. (i.e. we want a hint of
 * nominal typing in TypeScript).
 *
 * For example, if we create two types
 *
 * ```
 * type Id = string;
 * type PluginName = string;
 * ```
 *
 * We can (by design) inject `PluginName` instead of `Id` anywhere, because they
 * are _structurally_ the same, e.g.:
 *
 * ```
 * function onlyAcceptId(id: Id) { ... }
 *
 * const pluginName = 'foo' as PluginName;
 * onlyAcceptId(pluginName); // OK because structurally checked
 * ```
 *
 * However, with the `As` helper below we can "brand" (or "tag") the types, e.g.
 *
 * ```
 * type Id = string & As<'Id'>;
 * type PluginName = string & As<'PluginName'>;
 * ```
 *
 * Now we can no longer inject `PluginName` instead of `Id`, as TypeScript will
 * complain with:
 *
 * > Type '"PluginName"' is not assignable to type '"Id"'.
 *
 * To use this we have to first define our type (`Id` and `PluginName` above),
 * then to create a variable with the type we have to use a Type assertion
 * ("cast the variable"):
 *
 * ```
 * const myId = 'some-id' as Id; // the `as Id` asserts this is an `Id`
 * ```
 *
 * There is some discussion on this topic in:
 * - https://github.com/Microsoft/TypeScript/issues/4895
 * - https://github.com/Microsoft/TypeScript/issues/202
 *
 * You can also see a similar approach in the TypeScript code base itself:
 * https://github.com/Microsoft/TypeScript/blob/7b48a182c05ea4dea81bab73ecbbe9e013a79e99/src/compiler/types.ts#L693-L698
 *
 * As they write there:
 *
 * > By using the 'brands' we ensure that the type checker actually thinks you
 * > have something of the right type. [...] At runtime they have zero cost.
 */
export declare class As<S extends string> {
  private as: S;
}
