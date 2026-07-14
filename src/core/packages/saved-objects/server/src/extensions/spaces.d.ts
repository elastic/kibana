/**
 * The ISavedObjectsSpacesExtension interface defines the functions of a saved objects repository spaces extension.
 * It contains functions for getting the current namespace & getting and array of searchable spaces.
 */
export interface ISavedObjectsSpacesExtension {
    /**
     * Retrieves the active namespace ID. This is *not* the same as a namespace string. See also: `namespaceIdToString` and
     * `namespaceStringToId`.
     *
     * This takes the saved objects repository's namespace option as a parameter, and doubles as a validation function; if the namespace
     * option has already been set some other way, this will throw an error.
     */
    getCurrentNamespace: (namespace: string | undefined) => string | undefined;
    /**
     * Given a list of namespace strings, returns a subset that the user is authorized to search in.
     * If a wildcard '*' is used, it is expanded to an explicit list of namespace strings.
     */
    getSearchableNamespaces: (namespaces: string[] | undefined) => Promise<string[]>;
    /**
     * Returns a new Saved Objects Spaces Extension scoped to the specified namespace.
     * @param namespace Space to which the extension should be scoped to.
     */
    asScopedToNamespace(namespace: string): ISavedObjectsSpacesExtension;
}
