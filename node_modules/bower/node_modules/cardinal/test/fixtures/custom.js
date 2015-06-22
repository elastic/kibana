/* 
 * Copy this file and use it as a starting point for your custom cardinal color theme.
 * Just fill in or change the entries for the tokens you want to color
 * Keep in mind that more specific configurations override less specific ones.
 */

// Don't touch this definition
var colorNums = {
      white         :  37
    , black         :  30
    , blue          :  34
    , cyan          :  36
    , green         :  32
    , magenta       :  35
    , red           :  31
    , yellow        :  33
    , brightBlack   :  90
    , brightRed     :  91
    , brightGreen   :  92
    , brightYellow  :  93
    , brightBlue    :  94
    , brightMagenta :  95
    , brightCyan    :  96
    , brightWhite   :  97
    }
  , colors = {};


Object.keys(colorNums).forEach(function (k) {
  colors[k] = '\u001b[' + colorNums[k] + 'm:\u001b[39m';
});

// Change the below definitions in order to tweak the color theme.
module.exports = {

    'Boolean': {
      // changed from default
      'true'   :  colors.red

    , 'false'  :  undefined
    , _default :  colors.brightRed
    }

  , 'Identifier': {
      'undefined' :  colors.brightBlack
    , 'self'      :  colors.brightRed
    , 'console'   :  colors.blue
    , 'log'       :  colors.blue
    , 'warn'      :  colors.red
    , 'error'     :  colors.brightRed
    //
      // changed from default
    , _default    :  colors.brightCyan
    }

  , 'Null': {
      _default: colors.brightBlack
    }

  , 'Numeric': {
      _default: colors.blue
    }

  , 'String': {
      _default: colors.brightGreen
    }

  , 'Keyword': {
      'break'       :  undefined

    , 'case'        :  undefined
    , 'catch'       :  colors.cyan
    , 'continue'    :  undefined

    , 'debugger'    :  undefined
    , 'default'     :  undefined
    , 'delete'      :  colors.red
    , 'do'          :  undefined

    , 'else'        :  undefined

    , 'finally'     :  colors.cyan
    , 'for'         :  undefined
    , 'function'    :  undefined

    , 'if'          :  undefined
    , 'in'          :  undefined
    , 'instanceof'  :  undefined

    , 'new'         :  colors.red
    , 'return'      :  colors.red
    , 'switch'      :  undefined

    , 'this'        :  colors.brightRed
    , 'throw'       :  undefined
    , 'try'         :  colors.cyan
    , 'typeof'      :  undefined

    , 'var'         :  colors.green
    , 'void'        :  undefined

    , 'while'       :  undefined
    , 'with'        :  undefined
    , _default      :  colors.brightBlue
  }
  , 'Punctuator': {
      ';': colors.brightBlack
    , '.': colors.green  
    , ',': colors.green  

    , '{': colors.yellow
    , '}': colors.yellow
    , '(': colors.brightBlack  
    , ')': colors.brightBlack  
    , '[': colors.yellow
    , ']': colors.yellow

    , '<': undefined
    , '>': undefined
    , '+': undefined
    , '-': undefined
    , '*': undefined
    , '%': undefined
    , '&': undefined
    , '|': undefined
    , '^': undefined
    , '!': undefined
    , '~': undefined
    , '?': undefined
    , ':': undefined
    , '=': undefined

    , '<=': undefined
    , '>=': undefined
    , '==': undefined
    , '!=': undefined
    , '++': undefined
    , '--': undefined
    , '<<': undefined
    , '>>': undefined
    , '&&': undefined
    , '||': undefined
    , '+=': undefined
    , '-=': undefined
    , '*=': undefined
    , '%=': undefined
    , '&=': undefined
    , '|=': undefined
    , '^=': undefined
    , '/=': undefined

    , '===': undefined
    , '!==': undefined
    , '>>>': undefined
    , '<<=': undefined
    , '>>=': undefined
    
    , '>>>=': undefined

    , _default: colors.brightYellow
  }

  , _default: undefined
};
