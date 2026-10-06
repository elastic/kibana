/**
 * If the active typing contains dot notation, we assume we need to access the object's properties
 * Currently only supporting one-level deep nesting
 */
export declare const isAccessingProperty: (activeTyping: string) => boolean;
/**
 * If the preceding word is a primitive type, e.g., "boolean",
 * we assume the user is declaring a variable and will skip autocomplete
 *
 * Note: this isn't entirely exhaustive.
 * For example, you may use a class as a type, e.g., "String myVar ="
 */
export declare const hasDeclaredType: (activeLineWords: string[], primitives: string[]) => boolean;
/**
 * If the active line words contains the "boolean" type and "=" token,
 * we assume the user is defining a boolean value and skip autocomplete
 */
export declare const isDefiningBoolean: (activeLineWords: string[]) => boolean;
/**
 * If the active typing contains a start or end quotation mark,
 * we assume the user is defining a string and skip autocomplete
 */
export declare const isDefiningString: (activeTyping: string) => boolean;
/**
 * Check if the preceding word contains the "new" keyword
 */
export declare const isConstructorInstance: (activeLineWords: string[]) => boolean;
/**
 * Check if the user appears to be accessing a document field
 */
export declare const isDeclaringField: (activeTyping: string) => boolean;
/**
 * Static suggestions serve as a catch-all most of the time
 * However, there are a few situations where we do not want to show them and instead default to the built-in monaco (abc) autocomplete
 * 1. If the preceding word is a primitive type, e.g., "boolean", we assume the user is declaring a variable name
 * 2. If the string contains a "dot" character, we assume the user is attempting to access a property that we do not have information for
 * 3. If the user is defining a variable with a boolean type, e.g., "boolean myBoolean ="
 * 4. If the user is defining a string
 */
export declare const showStaticSuggestions: (activeTyping: string, activeLineWords: string[], primitives: string[]) => boolean;
