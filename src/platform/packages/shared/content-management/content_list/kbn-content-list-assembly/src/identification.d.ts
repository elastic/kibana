import type { ReactLikeElement } from './types';
/**
 * Type guard: checks if value has React element structure.
 *
 * @param value - The value to check.
 * @returns `true` if the value looks like a React element.
 */
export declare const isReactLikeElement: (value: unknown) => value is ReactLikeElement;
/**
 * Gets the part name from a declarative component's static Symbol property.
 *
 * Returns the part name string if the element belongs to the specified
 * assembly, or `undefined` otherwise.
 *
 * @param element - The element to check.
 * @param assembly - The assembly name.
 * @returns The part name string, or `undefined` if not found.
 */
export declare const getPartType: (element: unknown, assembly: string) => string | undefined;
/**
 * Gets the static preset from a declarative component's Symbol property.
 *
 * @param element - The element to extract the preset from.
 * @param assembly - The assembly name.
 * @returns The preset string, or `undefined` if not found.
 */
export declare const getPresetId: (element: unknown, assembly: string) => string | undefined;
