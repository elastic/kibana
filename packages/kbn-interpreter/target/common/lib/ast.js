"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fromExpression = fromExpression;
exports.safeElementFromExpression = safeElementFromExpression;
exports.toExpression = toExpression;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _get_type = require("./get_type");

var _grammar = require("./grammar");

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
function getArgumentString(arg, argKey) {
  var level = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var type = (0, _get_type.getType)(arg);

  function maybeArgKey(argKey, argString) {
    return argKey == null || argKey === '_' ? argString : "".concat(argKey, "=").concat(argString);
  }

  if (type === 'string') {
    // correctly (re)escape double quotes
    var escapedArg = arg.replace(/[\\"]/g, '\\$&'); // $& means the whole matched string

    return maybeArgKey(argKey, "\"".concat(escapedArg, "\""));
  }

  if (type === 'boolean' || type === 'null' || type === 'number') {
    // use values directly
    return maybeArgKey(argKey, "".concat(arg));
  }

  if (type === 'expression') {
    // build subexpressions
    return maybeArgKey(argKey, "{".concat(getExpression(arg.chain, level + 1), "}"));
  } // unknown type, throw with type value


  throw new Error("Invalid argument type in AST: ".concat(type));
}

function getExpressionArgs(block) {
  var level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  var args = block.arguments;
  var hasValidArgs = (0, _typeof2.default)(args) === 'object' && args != null && !Array.isArray(args);
  if (!hasValidArgs) throw new Error('Arguments can only be an object');
  var argKeys = Object.keys(args);
  var MAX_LINE_LENGTH = 80; // length before wrapping arguments

  return argKeys.map(function (argKey) {
    return args[argKey].reduce(function (acc, arg) {
      var argString = getArgumentString(arg, argKey, level);
      var lineLength = acc.split('\n').pop().length; // if arg values are too long, move it to the next line

      if (level === 0 && lineLength + argString.length > MAX_LINE_LENGTH) {
        return "".concat(acc, "\n  ").concat(argString);
      } // append arg values to existing arg values


      if (lineLength > 0) return "".concat(acc, " ").concat(argString); // start the accumulator with the first arg value

      return argString;
    }, '');
  });
}

function fnWithArgs(fnName, args) {
  if (!args || args.length === 0) return fnName;
  return "".concat(fnName, " ").concat(args.join(' '));
}

function getExpression(chain) {
  var level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  if (!chain) throw new Error('Expressions must contain a chain'); // break new functions onto new lines if we're not in a nested/sub-expression

  var separator = level > 0 ? ' | ' : '\n| ';
  return chain.map(function (chainObj) {
    var type = (0, _get_type.getType)(chainObj);

    if (type === 'function') {
      var fn = chainObj.function;
      if (!fn || fn.length === 0) throw new Error('Functions must have a function name');
      var expArgs = getExpressionArgs(chainObj, level);
      return fnWithArgs(fn, expArgs);
    }
  }, []).join(separator);
}

function fromExpression(expression) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'expression';

  try {
    return (0, _grammar.parse)(String(expression), {
      startRule: type
    });
  } catch (e) {
    throw new Error("Unable to parse expression: ".concat(e.message));
  }
} // TODO: OMG This is so bad, we need to talk about the right way to handle bad expressions since some are element based and others not


function safeElementFromExpression(expression) {
  try {
    return fromExpression(expression);
  } catch (e) {
    return fromExpression("markdown\n\"## Crud.\nCanvas could not parse this element's expression. I am so sorry this error isn't more useful. I promise it will be soon.\n\nThanks for understanding,\n#### Management\n\"");
  }
} // TODO: Respect the user's existing formatting


function toExpression(astObj) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'expression';
  if (type === 'argument') return getArgumentString(astObj);
  var validType = ['expression', 'function'].includes((0, _get_type.getType)(astObj));
  if (!validType) throw new Error('Expression must be an expression or argument function');

  if ((0, _get_type.getType)(astObj) === 'expression') {
    if (!Array.isArray(astObj.chain)) throw new Error('Expressions must contain a chain');
    return getExpression(astObj.chain);
  }

  var expArgs = getExpressionArgs(astObj);
  return fnWithArgs(astObj.function, expArgs);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb21tb24vbGliL2FzdC5qcyJdLCJuYW1lcyI6WyJnZXRBcmd1bWVudFN0cmluZyIsImFyZyIsImFyZ0tleSIsImxldmVsIiwidHlwZSIsIm1heWJlQXJnS2V5IiwiYXJnU3RyaW5nIiwiZXNjYXBlZEFyZyIsInJlcGxhY2UiLCJnZXRFeHByZXNzaW9uIiwiY2hhaW4iLCJFcnJvciIsImdldEV4cHJlc3Npb25BcmdzIiwiYmxvY2siLCJhcmdzIiwiYXJndW1lbnRzIiwiaGFzVmFsaWRBcmdzIiwiQXJyYXkiLCJpc0FycmF5IiwiYXJnS2V5cyIsIk9iamVjdCIsImtleXMiLCJNQVhfTElORV9MRU5HVEgiLCJtYXAiLCJyZWR1Y2UiLCJhY2MiLCJsaW5lTGVuZ3RoIiwic3BsaXQiLCJwb3AiLCJsZW5ndGgiLCJmbldpdGhBcmdzIiwiZm5OYW1lIiwiam9pbiIsInNlcGFyYXRvciIsImNoYWluT2JqIiwiZm4iLCJmdW5jdGlvbiIsImV4cEFyZ3MiLCJmcm9tRXhwcmVzc2lvbiIsImV4cHJlc3Npb24iLCJTdHJpbmciLCJzdGFydFJ1bGUiLCJlIiwibWVzc2FnZSIsInNhZmVFbGVtZW50RnJvbUV4cHJlc3Npb24iLCJ0b0V4cHJlc3Npb24iLCJhc3RPYmoiLCJ2YWxpZFR5cGUiLCJpbmNsdWRlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQW1CQTs7QUFDQTs7QUFwQkE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXNCQSxTQUFTQSxpQkFBVCxDQUEyQkMsR0FBM0IsRUFBZ0NDLE1BQWhDLEVBQW1EO0FBQUEsTUFBWEMsS0FBVyx1RUFBSCxDQUFHO0FBQ2pELE1BQU1DLElBQUksR0FBRyx1QkFBUUgsR0FBUixDQUFiOztBQUVBLFdBQVNJLFdBQVQsQ0FBcUJILE1BQXJCLEVBQTZCSSxTQUE3QixFQUF3QztBQUN0QyxXQUFPSixNQUFNLElBQUksSUFBVixJQUFrQkEsTUFBTSxLQUFLLEdBQTdCLEdBQW1DSSxTQUFuQyxhQUFrREosTUFBbEQs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LEVBQW1EO0FBQUEsTUFBckIxQyxJQUFxQix1RUFBZCxZQUFjO0FBQ3hELE1BQUlBLElBQUksS0FBSyxVQUFiLEVBQXlCLE9BQU9KLGlCQUFpQixDQUFDOEMsTUFBRCxDQUF4QjtBQUV6QixNQUFNQyxTQUFTLEdBQUcsQ0FBQyxZQUFELEVBQWUsVUFBZixFQUEyQkMsUUFBM0IsQ0FBb0MsdUJBQVFGLE1BQVIsQ0FBcEMsQ0FBbEI7QUFDQSxNQUFJLENBQUNDLFNBQUwsRUFBZ0IsTUFBTSxJQUFJcEMsS0FBSixDQUFVLHVEQUFWLENBQU47O0FBRWhCLE1BQUksdUJBQVFtQyxNQUFSLE1BQW9CLFlBQXhCLEVBQXNDO0FBQ3BDLFFBQUksQ0FBQzdCLEtBQUssQ0FBQ0MsT0FBTixDQUFjNEIsTUFBTSxDQUFDcEMsS0FBckIsQ0FBTCxFQUFrQyxNQUFNLElBQUlDLEtBQUosQ0FBVSxrQ0FBVixDQUFOO0FBRWxDLFdBQU9GLGFBQWEsQ0FBQ3FDLE1BQU0sQ0FBQ3BDLEtBQVIsQ0FBcEI7QUFDRDs7QUFFRCxNQUFNMkIsT0FBTyxHQUFHekIsaUJBQWlCLENBQUNrQyxNQUFELENBQWpDO0FBQ0EsU0FBT2hCLFVBQVUsQ0FBQ2dCLE1BQU0sQ0FBQ1YsUUFBUixFQUFrQkMsT0FBbEIsQ0FBakI7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBMaWNlbnNlZCB0byBFbGFzdGljc2VhcmNoIEIuVi4gdW5kZXIgb25lIG9yIG1vcmUgY29udHJpYnV0b3JcbiAqIGxpY2Vuc2UgYWdyZWVtZW50cy4gU2VlIHRoZSBOT1RJQ0UgZmlsZSBkaXN0cmlidXRlZCB3aXRoXG4gKiB0aGlzIHdvcmsgZm9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb24gcmVnYXJkaW5nIGNvcHlyaWdodFxuICogb3duZXJzaGlwLiBFbGFzdGljc2VhcmNoIEIuVi4gbGljZW5zZXMgdGhpcyBmaWxlIHRvIHlvdSB1bmRlclxuICogdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heVxuICogbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZyxcbiAqIHNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuXG4gKiBcIkFTIElTXCIgQkFTSVMsIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWVxuICogS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlXG4gKiBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kIGxpbWl0YXRpb25zXG4gKiB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuXG5pbXBvcnQgeyBnZXRUeXBlIH0gZnJvbSAnLi9nZXRfdHlwZSc7XG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJy4vZ3JhbW1hcic7XG5cbmZ1bmN0aW9uIGdldEFyZ3VtZW50U3RyaW5nKGFyZywgYXJnS2V5LCBsZXZlbCA9IDApIHtcbiAgY29uc3QgdHlwZSA9IGdldFR5cGUoYXJnKTtcblxuICBmdW5jdGlvbiBtYXliZUFyZ0tleShhcmdLZXksIGFyZ1N0cmluZykge1xuICAgIHJldHVybiBhcmdLZXkgPT0gbnVsbCB8fCBhcmdLZXkgPT09ICdfJyA/IGFyZ1N0cmluZyA6IGAke2FyZ0tleX09JHthcmdTdHJpbmd9YDtcbiAgfVxuXG4gIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIC8vIGNvcnJlY3RseSAocmUpZXNjYXBlIGRvdWJsZSBxdW90ZXNcbiAgICBjb25zdCBlc2NhcGVkQXJnID0gYXJnLnJlcGxhY2UoL1tcXFxcXCJdL2csICdcXFxcJCYnKTsgLy8gJCYgbWVhbnMgdGhlIHdob2xlIG1hdGNoZWQgc3RyaW5nXG4gICAgcmV0dXJuIG1heWJlQXJnS2V5KGFyZ0tleSwgYFwiJHtlc2NhcGVkQXJnfVwiYCk7XG4gIH1cblxuICBpZiAodHlwZSA9PT0gJ2Jvb2xlYW4nIHx8IHR5cGUgPT09ICdudWxsJyB8fCB0eXBlID09PSAnbnVtYmVyJykge1xuICAgIC8vIHVzZSB2YWx1ZXMgZGlyZWN0bHlcbiAgICByZXR1cm4gbWF5YmVBcmdLZXkoYXJnS2V5LCBgJHthcmd9YCk7XG4gIH1cblxuICBpZiAodHlwZSA9PT0gJ2V4cHJlc3Npb24nKSB7XG4gICAgLy8gYnVpbGQgc3ViZXhwcmVzc2lvbnNcbiAgICByZXR1cm4gbWF5YmVBcmdLZXkoYXJnS2V5LCBgeyR7Z2V0RXhwcmVzc2lvbihhcmcuY2hhaW4sIGxldmVsICsgMSl9fWApO1xuICB9XG5cbiAgLy8gdW5rbm93biB0eXBlLCB0aHJvdyB3aXRoIHR5cGUgdmFsdWVcbiAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGFyZ3VtZW50IHR5cGUgaW4gQVNUOiAke3R5cGV9YCk7XG59XG5cbmZ1bmN0aW9uIGdldEV4cHJlc3Npb25BcmdzKGJsb2NrLCBsZXZlbCA9IDApIHtcbiAgY29uc3QgYXJncyA9IGJsb2NrLmFyZ3VtZW50cztcbiAgY29uc3QgaGFzVmFsaWRBcmdzID0gdHlwZW9mIGFyZ3MgPT09ICdvYmplY3QnICYmIGFyZ3MgIT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheShhcmdzKTtcblxuICBpZiAoIWhhc1ZhbGlkQXJncykgdGhyb3cgbmV3IEVycm9yKCdBcmd1bWVudHMgY2FuIG9ubHkgYmUgYW4gb2JqZWN0Jyk7XG5cbiAgY29uc3QgYXJnS2V5cyA9IE9iamVjdC5rZXlzKGFyZ3MpO1xuICBjb25zdCBNQVhfTElORV9MRU5HVEggPSA4MDsgLy8gbGVuZ3RoIGJlZm9yZSB3cmFwcGluZyBhcmd1bWVudHNcbiAgcmV0dXJuIGFyZ0tleXMubWFwKGFyZ0tleSA9PlxuICAgIGFyZ3NbYXJnS2V5XS5yZWR1Y2UoKGFjYywgYXJnKSA9PiB7XG4gICAgICBjb25zdCBhcmdTdHJpbmcgPSBnZXRBcmd1bWVudFN0cmluZyhhcmcsIGFyZ0tleSwgbGV2ZWwpO1xuICAgICAgY29uc3QgbGluZUxlbmd0aCA9IGFjYy5zcGxpdCgnXFxuJykucG9wKCkubGVuZ3RoO1xuXG4gICAgICAvLyBpZiBhcmcgdmFsdWVzIGFyZSB0b28gbG9uZywgbW92ZSBpdCB0byB0aGUgbmV4dCBsaW5lXG4gICAgICBpZiAobGV2ZWwgPT09IDAgJiYgbGluZUxlbmd0aCArIGFyZ1N0cmluZy5sZW5ndGggPiBNQVhfTElORV9MRU5HVEgpIHtcbiAgICAgICAgcmV0dXJuIGAke2FjY31cXG4gICR7YXJnU3RyaW5nfWA7XG4gICAgICB9XG5cbiAgICAgIC8vIGFwcGVuZCBhcmcgdmFsdWVzIHRvIGV4aXN0aW5nIGFyZyB2YWx1ZXNcbiAgICAgIGlmIChsaW5lTGVuZ3RoID4gMCkgcmV0dXJuIGAke2FjY30gJHthcmdTdHJpbmd9YDtcblxuICAgICAgLy8gc3RhcnQgdGhlIGFjY3VtdWxhdG9yIHdpdGggdGhlIGZpcnN0IGFyZyB2YWx1ZVxuICAgICAgcmV0dXJuIGFyZ1N0cmluZztcbiAgICB9LCAnJylcbiAgKTtcbn1cblxuZnVuY3Rpb24gZm5XaXRoQXJncyhmbk5hbWUsIGFyZ3MpIHtcbiAgaWYgKCFhcmdzIHx8IGFyZ3MubGVuZ3RoID09PSAwKSByZXR1cm4gZm5OYW1lO1xuICByZXR1cm4gYCR7Zm5OYW1lfSAke2FyZ3Muam9pbignICcpfWA7XG59XG5cbmZ1bmN0aW9uIGdldEV4cHJlc3Npb24oY2hhaW4sIGxldmVsID0gMCkge1xuICBpZiAoIWNoYWluKSB0aHJvdyBuZXcgRXJyb3IoJ0V4cHJlc3Npb25zIG11c3QgY29udGFpbiBhIGNoYWluJyk7XG5cbiAgLy8gYnJlYWsgbmV3IGZ1bmN0aW9ucyBvbnRvIG5ldyBsaW5lcyBpZiB3ZSdyZSBub3QgaW4gYSBuZXN0ZWQvc3ViLWV4cHJlc3Npb25cbiAgY29uc3Qgc2VwYXJhdG9yID0gbGV2ZWwgPiAwID8gJyB8ICcgOiAnXFxufCAnO1xuXG4gIHJldHVybiBjaGFpblxuICAgIC5tYXAoY2hhaW5PYmogPT4ge1xuICAgICAgY29uc3QgdHlwZSA9IGdldFR5cGUoY2hhaW5PYmopO1xuXG4gICAgICBpZiAodHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb25zdCBmbiA9IGNoYWluT2JqLmZ1bmN0aW9uO1xuICAgICAgICBpZiAoIWZuIHx8IGZuLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdGdW5jdGlvbnMgbXVzdCBoYXZlIGEgZnVuY3Rpb24gbmFtZScpO1xuXG4gICAgICAgIGNvbnN0IGV4cEFyZ3MgPSBnZXRFeHByZXNzaW9uQXJncyhjaGFpbk9iaiwgbGV2ZWwpO1xuXG4gICAgICAgIHJldHVybiBmbldpdGhBcmdzKGZuLCBleHBBcmdzKTtcbiAgICAgIH1cbiAgICB9LCBbXSlcbiAgICAuam9pbihzZXBhcmF0b3IpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZnJvbUV4cHJlc3Npb24oZXhwcmVzc2lvbiwgdHlwZSA9ICdleHByZXNzaW9uJykge1xuICB0cnkge1xuICAgIHJldHVybiBwYXJzZShTdHJpbmcoZXhwcmVzc2lvbiksIHsgc3RhcnRSdWxlOiB0eXBlIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBVbmFibGUgdG8gcGFyc2UgZXhwcmVzc2lvbjogJHtlLm1lc3NhZ2V9YCk7XG4gIH1cbn1cblxuLy8gVE9ETzogT01HIFRoaXMgaXMgc28gYmFkLCB3ZSBuZWVkIHRvIHRhbGsgYWJvdXQgdGhlIHJpZ2h0IHdheSB0byBoYW5kbGUgYmFkIGV4cHJlc3Npb25zIHNpbmNlIHNvbWUgYXJlIGVsZW1lbnQgYmFzZWQgYW5kIG90aGVycyBub3RcbmV4cG9ydCBmdW5jdGlvbiBzYWZlRWxlbWVudEZyb21FeHByZXNzaW9uKGV4cHJlc3Npb24pIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnJvbUV4cHJlc3Npb24oZXhwcmVzc2lvbik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZnJvbUV4cHJlc3Npb24oXG4gICAgICBgbWFya2Rvd25cblwiIyMgQ3J1ZC5cbkNhbnZhcyBjb3VsZCBub3QgcGFyc2UgdGhpcyBlbGVtZW50J3MgZXhwcmVzc2lvbi4gSSBhbSBzbyBzb3JyeSB0aGlzIGVycm9yIGlzbid0IG1vcmUgdXNlZnVsLiBJIHByb21pc2UgaXQgd2lsbCBiZSBzb29uLlxuXG5UaGFua3MgZm9yIHVuZGVyc3RhbmRpbmcsXG4jIyMjIE1hbmFnZW1lbnRcblwiYFxuICAgICk7XG4gIH1cbn1cblxuLy8gVE9ETzogUmVzcGVjdCB0aGUgdXNlcidzIGV4aXN0aW5nIGZvcm1hdHRpbmdcbmV4cG9ydCBmdW5jdGlvbiB0b0V4cHJlc3Npb24oYXN0T2JqLCB0eXBlID0gJ2V4cHJlc3Npb24nKSB7XG4gIGlmICh0eXBlID09PSAnYXJndW1lbnQnKSByZXR1cm4gZ2V0QXJndW1lbnRTdHJpbmcoYXN0T2JqKTtcblxuICBjb25zdCB2YWxpZFR5cGUgPSBbJ2V4cHJlc3Npb24nLCAnZnVuY3Rpb24nXS5pbmNsdWRlcyhnZXRUeXBlKGFzdE9iaikpO1xuICBpZiAoIXZhbGlkVHlwZSkgdGhyb3cgbmV3IEVycm9yKCdFeHByZXNzaW9uIG11c3QgYmUgYW4gZXhwcmVzc2lvbiBvciBhcmd1bWVudCBmdW5jdGlvbicpO1xuXG4gIGlmIChnZXRUeXBlKGFzdE9iaikgPT09ICdleHByZXNzaW9uJykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShhc3RPYmouY2hhaW4pKSB0aHJvdyBuZXcgRXJyb3IoJ0V4cHJlc3Npb25zIG11c3QgY29udGFpbiBhIGNoYWluJyk7XG5cbiAgICByZXR1cm4gZ2V0RXhwcmVzc2lvbihhc3RPYmouY2hhaW4pO1xuICB9XG5cbiAgY29uc3QgZXhwQXJncyA9IGdldEV4cHJlc3Npb25BcmdzKGFzdE9iaik7XG4gIHJldHVybiBmbldpdGhBcmdzKGFzdE9iai5mdW5jdGlvbiwgZXhwQXJncyk7XG59XG4iXX0=