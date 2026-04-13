/**
 * Returns a rotating hint string for the date range input placeholder.
 * The hint educates users about the kinds of expressions the input can parse.
 * Each time {@link text} transitions from non-empty to empty (i.e. the input is cleared),
 * the hint cycles to the next category of expression.
 *
 * @param text - The current input text value
 * @returns A hint string suitable for use as a placeholder
 */
export declare function useInputHintText(text: string): string;
