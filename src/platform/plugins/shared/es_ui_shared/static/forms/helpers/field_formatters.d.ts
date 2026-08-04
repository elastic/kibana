/**
 * NOTE: The toInt() formatter does _not_ play well if we enter the "e" letter in a "number" input
 * as it does not trigger an "onChange" event.
 * I searched if it was a bug and found this thread (https://github.com/facebook/react/pull/7359#event-1017024857)
 * We will need to investigate this a little further.
 *
 * @param value The string value to convert to number
 */
export declare const toInt: (value: string) => number;
