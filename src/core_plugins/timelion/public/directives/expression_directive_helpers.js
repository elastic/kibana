import _ from 'lodash';

export class FunctionSuggestions {
  constructor() {
    this.reset();
  }

  reset() {
    this.index = 0;
    this.list = [];
    this.isVisible = false;
  }

  setList(list) {
    this.list = list;

    // We may get a shorter list than the one we have now, so we need to make sure our index doesn't
    // fall outside of the new list's range.
    this.index = Math.max(0, Math.min(this.index, this.list.length - 1));
  }

  getCount() {
    return this.list.length;
  }

  isEmpty() {
    return this.list.length === 0;
  }

  show() {
    this.isVisible = true;
  }

  hide() {
    this.isVisible = false;
  }

  stepForward() {
    if (this.index > 0) {
      this.index -= 1;
    }
  }

  stepBackward() {
    if (this.index < this.list.length - 1) {
      this.index += 1;
    }
  }
}

export function findFunction(position, functionList) {
  let matchingFunction;

  functionList.forEach(func => {
    if ((func.location.min) < position && position < (func.location.max)) {
      if (!matchingFunction || func.text.length < matchingFunction.text.length) {
        matchingFunction = func;
      }
    }
  });

  return matchingFunction;
}

export function suggest(val, caretPosition, functionList, Parser) {
  return new Promise((resolve, reject) => {
    try {
      // Inside an existing function providing suggestion only as a reference. Maybe suggest an argument?
      findFunction(caretPosition, Parser.parse(val).functions);

      // TODO: Reference suggestors. Only supporting completion right now;

      // We rely on peg to throw an error in order to suggest function(s). If peg doesn't
      // throw an error, then we have no suggestions to offer.
      return reject();
    } catch (e) {
      // NOTE: This is a peg SyntaxError.
      try { // Is this a structured exception?
        const error = JSON.parse(e.message);
        const location = error.location;

        if (location.min > caretPosition || location.max <= caretPosition) {
          return reject({ location });
        }
        // TODO: Abstract structured exception handling;
        if (error.type === 'incompleteFunction') {
          if (error.function == null) {
            return resolve({
              list: functionList,
              location,
            });
          } else {
            const list = _.compact(_.map(functionList, func => {
              if (_.startsWith(func.name, error.function)) {
                return func;
              }
            }));
            return resolve({ list, location });
          }
        }
      } catch (e) {
        return reject();
      }
    }
  });
}

export function insertAtLocation(value, destination, min, max) {
  // Insert the value at a location caret within the destination.
  const startOf = destination.slice(0, min);
  const endOf =  destination.slice(max, destination.length);
  return `${startOf}${value}${endOf}`;
}
