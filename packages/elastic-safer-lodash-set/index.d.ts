/*
 * This file is forked from the DefinitelyTyped project (https://github.com/DefinitelyTyped/DefinitelyTyped),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

export = SaferLodashSet;
export as namespace SaferLodashSet;

type Many<T> = T | readonly T[];
type PropertyName = string | number | symbol;
type PropertyPath = Many<PropertyName>;
type SetWithCustomizer<T> = (nsValue: any, key: string, nsObject: T) => any;

declare const SaferLodashSet: SaferLodashSet.SaferLoDashStatic;
declare namespace SaferLodashSet {
  interface SaferLoDashStatic {
    /**
     * Sets the value at path of object. If a portion of path doesn’t exist it’s
     * created. Arrays are created for missing index properties while objects
     * are created for all other missing properties. Use SaferLodashSet.setWith
     * to customize path creation.
     *
     * @param object The object to modify.
     * @param path The path of the property to set.
     * @param value The value to set.
     * @return Returns object.
     */
    set<T extends object>(object: T, path: PropertyPath, value: any): T;
    /**
     * @see SaferLodashSet.set
     */
    set<TResult>(object: object, path: PropertyPath, value: any): TResult;

    /**
     * This method is like SaferLodashSet.set except that it accepts customizer
     * which is invoked to produce the objects of path. If customizer returns
     * undefined path creation is handled by the method instead. The customizer
     * is invoked with three arguments: (nsValue, key, nsObject).
     *
     * @param object The object to modify.
     * @param path The path of the property to set.
     * @param value The value to set.
     * @param customizer The function to customize assigned values.
     * @return Returns object.
     */
    setWith<T extends object>(
      object: T,
      path: PropertyPath,
      value: any,
      customizer?: SetWithCustomizer<T>
    ): T;
    /**
     * @see SaferLodashSet.setWith
     */
    setWith<T extends object, TResult>(
      object: T,
      path: PropertyPath,
      value: any,
      customizer?: SetWithCustomizer<T>
    ): TResult;
  }
}
