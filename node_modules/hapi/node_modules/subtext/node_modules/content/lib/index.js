// Load modules

var Boom = require('boom');
var Hoek = require('hoek');


// Declare internals

var internals = {};


/*
    RFC 7231 Section 3.1.1.1

    media-type = type "/" subtype *( OWS ";" OWS parameter )
    type       = token
    subtype    = token
    parameter  = token "=" ( token / quoted-string )
*/

//                             1: type/subtype                    2: "b"   3: b
internals.contentTypeRegex = /^([^\/]+\/[^\s;]+)(?:(?:\s*;\s*boundary=(?:"([^"]+)"|([^;"]+)))|(?:\s*;\s*[^=]+=(?:(?:"(?:[^"]+)")|(?:[^;"]+))))*$/i;


exports.type = function (header) {

    var match = header.match(internals.contentTypeRegex);
    if (!match) {
        return Boom.badRequest('Invalid content-type header');
    }

    var mime = match[1].toLowerCase();
    var boundary = match[2] || match[3];
    if (mime.indexOf('multipart/') === 0 &&
        !boundary) {

        return Boom.badRequest('Invalid content-type header: multipart missing boundary');
    }

    return { mime: mime, boundary: boundary };
};


/*
    RFC 6266 Section 4.1 (http://tools.ietf.org/html/rfc6266#section-4.1)

    content-disposition = "Content-Disposition" ":" disposition-type *( ";" disposition-parm )
    disposition-type    = "inline" | "attachment" | token                                           ; case-insensitive
    disposition-parm    = filename-parm | token [ "*" ] "=" ( token | quoted-string | ext-value)    ; ext-value defined in [RFC5987], Section 3.2

    Content-Disposition header field values with multiple instances of the same parameter name are invalid.

    Note that due to the rules for implied linear whitespace (Section 2.1 of [RFC2616]), OPTIONAL whitespace
    can appear between words (token or quoted-string) and separator characters.

    Furthermore, note that the format used for ext-value allows specifying a natural language (e.g., "en"); this is of limited use
    for filenames and is likely to be ignored by recipients.
*/


internals.contentDispositionRegex = /^\s*form-data\s*(?:;\s*(.+))?$/i;

//                                        1: name   2: *            3: ext-value                  4: quoted  5: token
internals.contentDispositionParamRegex = /([^\=\*]+)(\*)?\s*\=\s*(?:([^;']+\'[\w-]*\'[^;\s]+)|(?:\"([^"]*)\")|([^;\s]*))(?:(?:\s*;\s*)|(?:\s*$))/g;

exports.disposition = function (header) {

    if (!header) {
        return Boom.badRequest('Missing content-disposition header');
    }

    var match = header.match(internals.contentDispositionRegex);
    if (!match) {
        return Boom.badRequest('Invalid content-disposition header format');
    }

    var parameters = match[1];
    if (!parameters) {
        return Boom.badRequest('Invalid content-disposition header missing parameters');
    }

    var result = {};
    var leftovers = parameters.replace(internals.contentDispositionParamRegex, function ($0, $1, $2, $3, $4, $5) {

        if ($2) {
            if (!$3) {
                return 'error';         // Generate leftovers
            }

            try {
                result[$1] = decodeURIComponent($3.split('\'')[2]);
            }
            catch (err) {
                return 'error';          // Generate leftover
            }
        }
        else {
            result[$1] = $4 || $5 || '';
        }

        return '';
    });

    if (leftovers) {
        return Boom.badRequest('Invalid content-disposition header format includes invalid parameters');
    }

    if (!result.name) {
        return Boom.badRequest('Invalid content-disposition header missing name parameter');
    }

    return result;
};