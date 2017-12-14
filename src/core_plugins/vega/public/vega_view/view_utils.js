import compactStringify from 'json-stringify-pretty-compact';

export class ViewUtils {

  /**
   * If the 2nd array parameter in args exists, append it to the warning/error string value
   */
  static formatWarningToStr(value) {
    if (arguments.length >= 2) {
      try {
        if (typeof arguments[1] === 'string') {
          value += `\n${arguments[1]}`;
        } else {
          value += '\n' + compactStringify(arguments[1], { maxLength: 70 });
        }
      } catch (err) {
        // ignore
      }
    }
    return value;
  }

  static formatErrorToStr(error) {
    if (!error) {
      error = 'ERR';
    } else if (error instanceof Error) {
      if (console && console.log) console.log(error);
      error = error.message;
    }
    return ViewUtils.formatWarningToStr(error, ...Array.from(arguments).slice(1));
  }

}
