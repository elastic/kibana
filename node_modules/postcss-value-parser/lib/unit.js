var minus = '-'.charCodeAt(0);
var plus  = '+'.charCodeAt(0);
var dot   = '.'.charCodeAt(0);
var zero  = '0'.charCodeAt(0);
var one   = '1'.charCodeAt(0);
var two   = '2'.charCodeAt(0);
var three = '3'.charCodeAt(0);
var four  = '4'.charCodeAt(0);
var five  = '5'.charCodeAt(0);
var six   = '6'.charCodeAt(0);
var seven = '7'.charCodeAt(0);
var eight = '8'.charCodeAt(0);
var nine  = '9'.charCodeAt(0);


module.exports = function (value) {
    var pos = 0;
    var length = value.length;
    var dotted = false;
    var containsNumber = false;
    var code;
    var number = '';

    while (pos < length) {
        code = value.charCodeAt(pos);

        if (code === zero  ||
           code === one   ||
           code === two   ||
           code === three ||
           code === four  ||
           code === five  ||
           code === six   ||
           code === seven ||
           code === eight ||
           code === nine) {
            number += value[pos];
            containsNumber = true;
        } else if (code === dot) {
            if (dotted) {
                break;
            }
            dotted = true;
            number += value[pos];
        } else if (code === plus || code === minus) {
            if (pos !== 0) {
                break;
            }
            number += value[pos];
        } else {
            break;
        }

        pos += 1;
    }

    return containsNumber ? {
        number: number,
        unit: value.slice(pos)
    } : false;
};
