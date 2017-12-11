import compactStringify from 'json-stringify-pretty-compact';

export class ViewUtils {

  /**
   * If the 2nd array parameter in args exists, append it to the warning/error string value
   */
  static expandError(value, args) {
    if (args.length >= 2) {
      try {
        if (typeof args[1] === 'string') {
          value += `\n${args[1]}`;
        } else {
          value += '\n' + compactStringify(args[1], { maxLength: 70 });
        }
      } catch (err) {
        // ignore
      }
    }
    return value;
  }

  static makeErrorMsg() {
    return { type: 'error', data: ViewUtils.expandError(...arguments) };
  }

  static makeWarningMsg() {
    return { type: 'warning', data: ViewUtils.expandError(...arguments) };
  }
}
