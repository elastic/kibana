// Load modules


// Declare internals

var internals = {};


exports.generate = function () {

    /*
        /path/{param}/path/{param?}
        /path/{param*2}/path
        /path/{param*2}
        /path/x{param}x
        /{param*}
    */

    var empty = '(?:^\\/$)';

    var legalChars = '[\\w\\!\\$&\'\\(\\)\\*\\+\\,;\\=\\:@\\-\\.~]';
    var encoded = '%[A-F0-9]{2}';

    var literalChar = '(?:' + legalChars + '|' + encoded + ')';
    var literal = literalChar + '+';
    var literalOptional = literalChar + '*';

    var midParam = '(?:\\{\\w+(?:\\*[1-9]\\d*)?\\})';                               // {p}, {p*2}
    var endParam = '(?:\\/(?:\\{\\w+(?:(?:\\*(?:[1-9]\\d*)?)|(?:\\?))?\\})?)?';     // {p}, {p*2}, {p*}, {p?}

    var partialParam = '(?:\\{\\w+\\??\\})';                                        // {p}, {p?}
    var mixedParam = '(?:(?:' + literal + partialParam + ')+' + literalOptional + ')|(?:' + partialParam + '(?:' + literal + partialParam + ')+' + literalOptional + ')|(?:' + partialParam + literal + ')';

    var segmentContent = '(?:' + literal + '|' + midParam + '|' + mixedParam + ')';
    var segment = '\\/' + segmentContent;
    var segments = '(?:' + segment + ')*';

    var path = '(?:^' + segments + endParam + '$)';

    //                1:literal               2:name   3:*  4:count  5:?
    var parseParam = '(' + literal + ')|(?:\\{(\\w+)(?:(\\*)(\\d+)?)?(\\?)?\\})';

    var expressions = {
        parseParam: new RegExp(parseParam, 'g'),
        validatePath: new RegExp(empty + '|' + path),
        validatePathEncoded: /%(?:2[146-9A-E]|3[\dABD]|4[\dA-F]|5[\dAF]|6[1-9A-F]|7[\dAE])/g
    };

    return expressions;
};
