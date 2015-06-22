// Methods to parse list and split it to array
var list = {

    // Split string to array by separator symbols with function and inside strings
    // cheching
    split: function (string, separators, last) {var S_ITER$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol.iterator||'@@iterator';var S_MARK$0 = typeof Symbol!=='undefined'&&Symbol&&Symbol["__setObjectSetter__"];function GET_ITER$0(v){if(v){if(Array.isArray(v))return 0;var f;if(S_MARK$0)S_MARK$0(v);if(typeof v==='object'&&typeof (f=v[S_ITER$0])==='function'){if(S_MARK$0)S_MARK$0(void 0);return f.call(v);}if(S_MARK$0)S_MARK$0(void 0);if((v+'')==='[object Generator]')return v;}throw new Error(v+' is not iterable')};var $D$0;var $D$1;var $D$2;
        var array   = [];
        var current = '';
        var split   = false;

        var func    = 0;
        var quote   = false;
        var escape  = false;

        for ( var i = 0; i < string.length; i++ ) {
            var letter = string[i];

            if ( quote ) {
                if ( escape ) {
                    escape = false;
                } else if ( letter == '\\' ) {
                    escape = true;
                } else if ( letter == quote ) {
                    quote = false;
                }
            } else if ( letter == '"' || letter == "'" ) {
                quote = letter;
            } else if ( letter == '(' ) {
                func += 1;
            } else if ( letter == ')' ) {
                if ( func > 0 ) func -= 1;
            } else if ( func === 0 ) {
                $D$0 = GET_ITER$0(separators);$D$2 = $D$0 === 0;$D$1 = ($D$2 ? separators.length : void 0);for ( var separator ;$D$2 ? ($D$0 < $D$1) : !($D$1 = $D$0["next"]())["done"];){separator = ($D$2 ? separators[$D$0++] : $D$1["value"]);
                    if ( letter == separator ) split = true;
                };$D$0 = $D$1 = $D$2 = void 0;
            }

            if ( split ) {
                if ( current !== '' ) array.push(current.trim());
                current = '';
                split   = false;
            } else {
                current += letter;
            }
        }

        if ( last || current !== '' ) array.push(current.trim());
        return array;
    },

    // Split list devided by space:
    //
    //   list.space('a b') #=> ['a', 'b']
    //
    // It check for fuction and strings:
    //
    //   list.space('calc(1px + 1em) "b c"') #=> ['calc(1px + 1em)', '"b c"']
    space: function (string) {
        return this.split(string, [' ', "\n", "\t"]);
    },

    // Split list devided by comma
    //
    //   list.comma('a, b') #=> ['a', 'b']
    //
    // It check for fuction and strings:
    //
    //   list.comma('rgba(0, 0, 0, 0) white') #=> ['rgba(0, 0, 0, 0)', '"white"']
    comma: function (string) {
        return this.split(string, [','], true);
    }

};

module.exports = list;
