
import { words } from 'lodash';

/**
 * @name {string} the name of the configuration object
 * @returns {string} a space demimited, lowercase string with
 *          special characters removed.
 *
 * Example: 'xPack:fooBar:foo_bar_baz' -> 'x pack foo bar foo bar baz'
 */
export function getAriaName(name) {
  return words(name).map(word => word.toLowerCase()).join(' ');
}
