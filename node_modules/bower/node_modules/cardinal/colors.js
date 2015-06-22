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

module.exports = colors;
